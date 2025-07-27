import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // Custom TooltipProvider protection rule
      "no-restricted-imports": [
        "error",
        {
          "paths": [
            {
              "name": "@/components/ui/tooltip",
              "importNames": ["TooltipProvider"],
              "message": "🚨 FORBIDDEN: TooltipProvider can only be imported in App.tsx and test-utils.tsx. Use only Tooltip, TooltipTrigger, TooltipContent components. Global TooltipProvider already exists in App.tsx."
            }
          ],
          "patterns": [
            {
              "group": ["**/ui/tooltip"],
              "importNames": ["TooltipProvider"],
              "message": "🚨 FORBIDDEN: Do not import TooltipProvider. Use individual tooltip components only."
            }
          ]
        }
      ]
    },
  }
);
