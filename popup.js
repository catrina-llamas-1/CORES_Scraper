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

      // Step 2: Fire the apply CustomEvent from MAIN world with the filters payload.
      const filters = preset.filters;
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: (filtersPayload) => {
          document.dispatchEvent(
            new CustomEvent("__gettelAutofillApply__", { detail: filtersPayload })
          );
        },
        args: [filters],
      });

      // Step 3: Read the result back from MAIN world.
      const resultArr = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: () => {
          return new Promise((resolve) => {
            const handler = (e) => {
              document.removeEventListener("__gettelAutofillResult__", handler);
              resolve(e.detail);
            };
            document.addEventListener("__gettelAutofillResult__", handler);
            setTimeout(() => {
              document.removeEventListener("__gettelAutofillResult__", handler);
              resolve({ applied: [], skipped: ["Timed out waiting for result"] });
            }, 3000);
          });
        },
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
