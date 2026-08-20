// GETTEL Filter Presets Configuration
// To add a new preset:
//   1. Add a new key under PRESETS
//   2. Set a "label" for the dropdown
//   3. Add entries under "filters" using the field name as the key
//
// Filter types:
//   "chosen_multi" — jQuery Chosen multi-select (pass array of option text values)
//   "chosen_single" — jQuery Chosen single-select (pass single string value)
//   "select"        — Standard HTML <select> (pass single string value)
//   "input"         — Standard text <input> (pass single string value)

const PRESETS = {
  investment_edmonton_metro: {
    label: "Investment Report \u2013 Edmonton Metro",
    filters: {
      asrch_city: {
        type: "chosen_multi",
        values: [
          "Edmonton",
          "Stony Plain",
          "Spruce Grove",
          "Acheson",
          "Parkland County",
          "St. Albert",
          "Sturgeon County",
          "Fort Saskatchewan",
          "Sherwood Park",
          "Strathcona County",
          "Leduc",
          "Leduc County",
          "Nisku",
          "Beaumont",
          "Devon"
        ]
      },
      asrch_prop_type: {
        type: "chosen_single",
        value: "Building"
      },
      // TODO: confirm exact field name — right-click the min sale price input,
      // Inspect, and check the name="..." attribute. Update key below if different.
      asrch_sale_fromprice: {
        type: "input",
        value: "1000000"
      }
    }
  }

  // ── ADD NEW PRESETS BELOW ────────────────────────────────────────────────
  //
  // Example skeleton:
  //
  // retail_edmonton: {
  //   label: "Retail Report \u2013 Edmonton",
  //   filters: {
  //     asrch_city: { type: "chosen_multi", values: ["Edmonton"] },
  //     asrch_prop_class: { type: "chosen_multi", values: ["Retail"] },
  //     asrch_sale_date_from: { type: "input", value: "2023-01-01" }
  //   }
  // },
  //
  // industrial_edmonton: {
  //   label: "Industrial Report \u2013 Edmonton",
  //   filters: {
  //     asrch_city: { type: "chosen_multi", values: ["Edmonton", "Nisku", "Acheson"] },
  //     asrch_prop_class: { type: "chosen_multi", values: ["Industrial"] }
  //   }
  // }
};
