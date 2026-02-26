const tokens = [
  { name: "Solana", symbol: "sol" },
  { name: "dogwifhat", symbol: "wif" },
  { name: "michi", symbol: "michi" },
  { name: "Jupiter", symbol: "jup" },
  { name: "Popcat (SOL)", symbol: "popcat" }
];
console.log(tokens.map(t => {
  const isNameLower = t.name.toLowerCase() === t.name;
  return { ...t, displaySymbol: isNameLower ? t.symbol.toLowerCase() : t.symbol.toUpperCase() };
}));
