// popup.js
// Applies filter presets by injecting page_executor.js into the MAIN world
// (which has access to the page's jQuery/Chosen), communicating via CustomEvents.

document.addEventListener("DOMContentLoaded", () => {
  const presetSelect = document.getElementById("presetSelect");
  const applyBtn     = document.getElementById("applyBtn");
  const statusMsg    = document.getElementById("statusMsg");
  const statusText   = document.getElementById("statusText");
  const statusDetail = document.getElementById("statusDetail");

  // ── Populate preset dropdown ──────────────────────────────────────────────
  Object.entries(PRESETS).forEach(([key, preset]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = preset.label;
    presetSelect.appendChild(opt);
  });

  // ── Restore last-used preset ──────────────────────────────────────────────
  chrome.storage.local.get("lastPreset", ({ lastPreset }) => {
    if (lastPreset && PRESETS[lastPreset]) {
      presetSelect.value = lastPreset;
    }
  });

  // ── Apply button ──────────────────────────────────────────────────────────
  applyBtn.addEventListener("click", async () => {
    const presetKey = presetSelect.value;
    const preset    = PRESETS[presetKey];

    if (!preset) {
      showStatus("error", "No preset selected.", "");
      return;
    }

    chrome.storage.local.set({ lastPreset: presetKey });
    setLoading(true);
    hideStatus();

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showStatus("error", "No active tab found.", "");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Inject the executor into MAIN world so it can access page jQuery.
      // world: "MAIN" bypasses CSP restrictions on extension scripts.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["page_executor.js"],
        world: "MAIN",
      });

      // Step 2: Register the result listener AND fire the apply CustomEvent in a
      // single injected call. page_executor.js's handler runs synchronously, so
      // if the listener were registered in a separate executeScript call *after*
      // dispatching (as before), the result event would already have fired and
      // been missed — every apply would falsely report "Timed out".
      const filters = preset.filters;
      const resultArr = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: (filtersPayload) => {
          return new Promise((resolve) => {
            const handler = (e) => {
              document.removeEventListener("__gettelAutofillResult__", handler);
              resolve(e.detail);
            };
            document.addEventListener("__gettelAutofillResult__", handler);
            document.dispatchEvent(
              new CustomEvent("__gettelAutofillApply__", { detail: filtersPayload })
            );
            setTimeout(() => {
              document.removeEventListener("__gettelAutofillResult__", handler);
              resolve({ applied: [], skipped: ["Timed out waiting for result"] });
            }, 3000);
          });
        },
        args: [filters],
      });

      const results = resultArr?.[0]?.result;
      setLoading(false);

      if (!results) {
        showStatus("error", "No response from page.", "");
        return;
      }

      const { applied, skipped } = results;
      if (skipped && skipped.length > 0) {
        showStatus(
          "warning",
          `Applied ${applied.length} filter(s). ${skipped.length} skipped.`,
          "Skipped:\n" + skipped.join("\n")
        );
      } else {
        showStatus(
          "success",
          `All ${applied.length} filter(s) applied successfully.`,
          ""
        );
      }
    } catch (err) {
      setLoading(false);
      showStatus("error", "Error applying filters.", err.message);
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function setLoading(on) {
    applyBtn.disabled = on;
    applyBtn.classList.toggle("loading", on);
  }

  function hideStatus() {
    statusMsg.classList.remove("visible", "success", "warning", "error");
  }

  function showStatus(type, text, detail) {
    statusMsg.className = `status visible ${type}`;
    statusText.textContent = text;
    statusDetail.style.whiteSpace = "pre-line";
    statusDetail.textContent = detail;
  }
});
