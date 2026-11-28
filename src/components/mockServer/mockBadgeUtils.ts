export function getMockMethodBadgeClass(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'text-[#61afef] bg-[#61afef]/10 border-[#61afef]/30';
    case 'POST':
      return 'text-[#e5c07b] bg-[#e5c07b]/10 border-[#e5c07b]/30';
    case 'PUT':
      return 'text-[#c678dd] bg-[#c678dd]/10 border-[#c678dd]/30';
    case 'DELETE':
      return 'text-[#ef596f] bg-[#ef596f]/10 border-[#ef596f]/30';
    case 'PATCH':
      return 'text-[#98c379] bg-[#98c379]/10 border-[#98c379]/30';
    default:
      return 'text-[#abb2bf] bg-[#abb2bf]/10 border-[#abb2bf]/30';
  }
}
