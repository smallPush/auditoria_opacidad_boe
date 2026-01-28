<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ijlVxAjhZR-GGd2NFIao5_bnd_lKPXT6

## Gemini Integration: Powering Civic Intelligence

This application leverages a sophisticated, multi-modal integration of Google's next-generation **Gemini 3** models to bridge the gap between complex legal jargon and citizen understanding.

- **Advanced Text Auditing (Gemini 3 Flash)**: The core "brain" of the project uses `gemini-3-flash-preview` to parse dense BOE XML data. It utilizes massive context windows to scan up to 30,000 characters of legal text, identifying buried budgetary transfers, opaque language, and potential red flags. By using **Structured Output (JSON Schema)**, it converts unstructured law into actionable data points like transparency ratings and "winners vs. losers" impact balances.

-  This enables the "translation" of a dry government notice into an impactful visual narrative for platforms like Instagram Reels or X.

This deep integration of reasoning, structured extraction, and generative creativity makes Gemini 3 the central engine enabling radical transparency in government publications.

### Safety Mechanism (Circuit Breaker)
To prevent excessive API usage or error loops, the application implements a strict **Circuit Breaker** mechanism. If any call to the Gemini API fails (due to network errors, quotas, or invalid keys), a global lock is activated (`isApiBlocked`).
- **Behavior:** All subsequent API attempts will be immediately blocked with the message: *"API calls are blocked due to a previous error."*
- **Reset:** The application must be reloaded/restarted to reset this safety lock.


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
