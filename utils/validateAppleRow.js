function validateAppleRow(row) {
  const errors = [];

  if (!row["CULTIVAR NAME"] || row["CULTIVAR NAME"].trim() === "") {
    errors.push("Missing or invalid CULTIVAR NAME");
  }

  if (!row["ACCESSION"] || !/^[a-zA-Z0-9]+$/.test(row["ACCESSION"])) {
    errors.push("Missing or invalid ACCESSION");
  }

  if (row["Origin Country"] && typeof row["Origin Country"] !== "string") {
    errors.push("Invalid Origin Country");
  }

  if (row["Origin Provir"] && !/^[A-Za-z]{2,}$/.test(row["Origin Provir"])) {
    errors.push("Invalid Origin Province");
  }

  if (row["Origin City"] && typeof row["Origin City"] !== "string") {
    errors.push("Invalid Origin City");
  }

  if (row["E pedigree"] && typeof row["E pedigree"] !== "string") {
    errors.push("Invalid E pedigree");
  }

  if (row["E GENUS"] && !/^[A-Z][a-z]+$/.test(row["E GENUS"])) {
    errors.push("Invalid E GENUS");
  }

  if (row["E SPECIES"] && !/^[a-z]+$/.test(row["E SPECIES"])) {
    errors.push("Invalid E SPECIES");
  }

  return errors;
}

module.exports = validateAppleRow;
