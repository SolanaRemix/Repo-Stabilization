(function () {
  const output = document.getElementById('pipeline-output');
  const runButton = document.getElementById('run-pipeline');

  async function runPipeline() {
    if (!output) return;
    output.textContent = 'Running deterministic pipeline...';
    try {
      const response = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      output.textContent = JSON.stringify(payload, null, 2);
    } catch (error) {
      output.textContent = `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  if (runButton) runButton.addEventListener('click', runPipeline);
})();
