// Intentionally empty: production/local restarts must not recreate demo products.
async function main() {
  return undefined;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
