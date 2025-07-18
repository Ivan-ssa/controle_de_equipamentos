document.getElementById("file-input").addEventListener("change", handleFiles);

function handleFiles(event) {
  const files = event.target.files;
  const output = document.getElementById("output");
  output.innerHTML = ""; // limpa resultados anteriores

  for (let i = 0; i < files.length; i++) {
    const reader = new FileReader();
    const file = files[i];

    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      output.innerHTML += `<h3>📄 ${file.name}</h3>`;

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const html = XLSX.utils.sheet_to_html(sheet);
        output.innerHTML += `<h4>📑 Aba: ${sheetName}</h4>${html}`;
      });
    };

    reader.readAsArrayBuffer(file);
  }
}
