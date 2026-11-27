import os
import subprocess
import struct
import zlib

def png_to_rgba(input_path, output_path):
    with open(input_path, 'rb') as f:
        data = f.read()
    
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    
    pos = 8
    ihdr_data = None
    idat_data = b''
    
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos+4])[0]
        ctype = data[pos+4:pos+8]
        cdata = data[pos+8:pos+8+length]
        pos += 12 + length
        
        if ctype == b'IHDR':
            width, height, bit_depth, color_type, comp, filt, interlace = struct.unpack('>IIBBBBB', cdata)
            ihdr_data = (width, height, bit_depth, color_type, comp, filt, interlace)
        elif ctype == b'IDAT':
            idat_data += cdata
            
    width, height, bit_depth, color_type, comp, filt, interlace = ihdr_data
    if color_type == 6:
        if input_path != output_path:
            with open(output_path, 'wb') as f:
                f.write(data)
        return
        
    raw = zlib.decompress(idat_data)
    
    line_bytes_rgb = 1 + width * 3
    new_raw = bytearray()
    
    for y in range(height):
        offset = y * line_bytes_rgb
        filt_byte = raw[offset]
        line = raw[offset+1:offset + line_bytes_rgb]
        new_raw.append(filt_byte)
        for x in range(width):
            new_raw.extend(line[x*3:x*3+3])
            new_raw.append(255)
            
    new_idat = zlib.compress(bytes(new_raw), 9)
    new_ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, comp, filt, interlace)
    
    def make_chunk(ctype, cdata):
        crc = zlib.crc32(ctype + cdata)
        return struct.pack('>I', len(cdata)) + ctype + cdata + struct.pack('>I', crc)
        
    out = b'\x89PNG\r\n\x1a\n'
    out += make_chunk(b'IHDR', new_ihdr)
    out += make_chunk(b'IDAT', new_idat)
    out += make_chunk(b'IEND', b'')
    
    with open(output_path, 'wb') as f:
        f.write(out)

def create_ico(png_files_with_sizes, output_ico_path):
    """Creates a Windows ICO file containing PNGs of various sizes."""
    images_data = []
    for path, size in png_files_with_sizes:
        with open(path, 'rb') as f:
            png_bytes = f.read()
        images_data.append((size, png_bytes))
    
    # Header: 2 bytes reserved (0), 2 bytes type (1 = ICO), 2 bytes count
    ico_header = struct.pack('<HHH', 0, 1, len(images_data))
    
    # Calculate offset of image data: 6 bytes header + 16 bytes per directory entry
    offset = 6 + (16 * len(images_data))
    
    entries = []
    payloads = []
    
    for size, png_bytes in images_data:
        w = size if size < 256 else 0
        h = size if size < 256 else 0
        bColorCount = 0
        bReserved = 0
        wPlanes = 1
        wBitCount = 32
        dwBytesInRes = len(png_bytes)
        dwImageOffset = offset
        
        entry = struct.pack('<BBBBHHII', w, h, bColorCount, bReserved, wPlanes, wBitCount, dwBytesInRes, dwImageOffset)
        entries.append(entry)
        payloads.append(png_bytes)
        offset += len(png_bytes)
        
    with open(output_ico_path, 'wb') as f:
        f.write(ico_header)
        for e in entries:
            f.write(e)
        for p in payloads:
            f.write(p)
    print(f"Created ICO: {output_ico_path}")

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icon_src = os.path.join(base_dir, 'build', 'icon.png')
    iconset_dir = os.path.join(base_dir, 'build', 'icon.iconset')
    icons_dir = os.path.join(base_dir, 'build', 'icons')
    public_dir = os.path.join(base_dir, 'public')
    
    os.makedirs(iconset_dir, exist_ok=True)
    os.makedirs(icons_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)
    
    # 1. macOS Iconset specifications
    mac_sizes = [
        ('icon_16x16.png', 16),
        ('icon_16x16@2x.png', 32),
        ('icon_32x32.png', 32),
        ('icon_32x32@2x.png', 64),
        ('icon_128x128.png', 128),
        ('icon_128x128@2x.png', 256),
        ('icon_256x256.png', 256),
        ('icon_256x256@2x.png', 512),
        ('icon_512x512.png', 512),
        ('icon_512x512@2x.png', 1024),
    ]
    
    for filename, size in mac_sizes:
        dest = os.path.join(iconset_dir, filename)
        subprocess.run(['sips', '-z', str(size), str(size), icon_src, '--out', dest], check=True, stdout=subprocess.DEVNULL)
        png_to_rgba(dest, dest)
    
    # Build icon.icns using iconutil if not already present
    icns_path = os.path.join(base_dir, 'build', 'icon.icns')
    if not os.path.exists(icns_path):
        try:
            subprocess.run(['iconutil', '-c', 'icns', iconset_dir, '-o', icns_path], check=True)
            print(f"Created ICNS: {icns_path}")
        except Exception as e:
            print(f"ICNS creation warning: {e}")
    
    # 2. Windows ICO
    ico_sizes = [16, 32, 48, 64, 128, 256]
    ico_entries = []
    for s in ico_sizes:
        temp_png = os.path.join(icons_dir, f'{s}x{s}.png')
        subprocess.run(['sips', '-z', str(s), str(s), icon_src, '--out', temp_png], check=True, stdout=subprocess.DEVNULL)
        png_to_rgba(temp_png, temp_png)
        ico_entries.append((temp_png, s))
        
    # Also generate 512x512 for Linux
    linux_512 = os.path.join(icons_dir, '512x512.png')
    subprocess.run(['sips', '-z', '512', '512', icon_src, '--out', linux_512], check=True, stdout=subprocess.DEVNULL)
    png_to_rgba(linux_512, linux_512)
    
    ico_path = os.path.join(base_dir, 'build', 'icon.ico')
    create_ico(ico_entries, ico_path)
    
    # 3. Web Favicons
    fav_32 = os.path.join(public_dir, 'favicon-32x32.png')
    fav_16 = os.path.join(public_dir, 'favicon-16x16.png')
    fav_192 = os.path.join(public_dir, 'logo-192.png')
    fav_512 = os.path.join(public_dir, 'logo-512.png')
    
    subprocess.run(['sips', '-z', '32', '32', icon_src, '--out', fav_32], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(['sips', '-z', '16', '16', icon_src, '--out', fav_16], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(['sips', '-z', '192', '192', icon_src, '--out', fav_192], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(['sips', '-z', '512', '512', icon_src, '--out', fav_512], check=True, stdout=subprocess.DEVNULL)
    
    subprocess.run(['cp', fav_32, os.path.join(public_dir, 'favicon.png')], check=True)
    subprocess.run(['cp', ico_path, os.path.join(public_dir, 'favicon.ico')], check=True)
    print("Generated web favicons in public/")

if __name__ == '__main__':
    main()
