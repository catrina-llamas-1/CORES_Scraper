// page_executor.js
// This file is injected into the MAIN world (page JS context) via
// chrome.scripting.executeScript({ world: "MAIN" }) so it has direct
// access to the page's own jQuery / Chosen instance.
//
// It receives the filters payload via a one-time CustomEvent fired
// from popup.js, applies them using the page's $, then dispatches
// a result event back.

(function () {
  // Only register the listener once per page load
  if (window.__gettelAutofillReady__) return;
  window.__gettelAutofillReady__ = true;

  document.addEventListener("__gettelAutofillApply__", (e) => {
    const filters = e.detail;
    const results = { applied: [], skipped: [] };

    if (typeof $ === "undefined") {
      document.dispatchEvent(
        new CustomEvent("__gettelAutofillResult__", {
          detail: { applied: [], skipped: ["jQuery not found on page"] },
        })
      );
      return;
    }

    for (const [fieldName, config] of Object.entries(filters)) {
      const $el = $(
        "select[name='" + fieldName + "'], input[name='" + fieldName + "']"
      );

      if (!$el.length) {
        results.skipped.push(fieldName + " (element not found)");
        continue;
      }

      try {
        if (config.type === "chosen_multi") {
          const matchedValues = [];
          $el.find("option").each(function () {
            if (config.values.includes($(this).text().trim())) {
              matchedValues.push($(this).val());
            }
          });
          $el.val(matchedValues).trigger("chosen:updated");
          results.applied.push(
            fieldName +
              " (" +
              matchedValues.length +
              "/" +
              config.values.length +
              " matched)"
          );
        } else if (config.type === "chosen_single") {
          let matched = null;
          $el.find("option").each(function () {
            if ($(this).text().trim() === config.value) {
              matched = $(this).val();
            }
          });
          if (matched !== null) {
            $el.val(matched).trigger("chosen:updated");
            results.applied.push(fieldName);
          } else {
            results.skipped.push(
              fieldName + ' (value "' + config.value + '" not found)'
            );
          }
        } else if (config.type === "select") {
          $el.val(config.value).trigger("change");
          results.applied.push(fieldName);
        } else if (config.type === "input") {
          $el.val(config.value).trigger("change");
          results.applied.push(fieldName);
        }
      } catch (err) {
        results.skipped.push(fieldName + " (error: " + err.message + ")");
      }
    }

    document.dispatchEvent(
      new CustomEvent("__gettelAutofillResult__", { detail: results })
    );
  });
})();
