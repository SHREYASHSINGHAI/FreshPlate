const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const newRetryFunc = `const generateContentWithRetry = async (params: any, retries = 3) => {
  const modelsToTry = [params.model || "gemini-1.5-flash", "gemini-1.5-pro"];
  
  for (const model of modelsToTry) {
    for (let i = 0; i < retries; i++) {
      try {
        const attemptParams = { ...params, model };
        return await ai.models.generateContent(attemptParams);
      } catch (error: any) {
        const isUnavailable = error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE") || error?.status === "UNAVAILABLE" || error?.code === 503 || error?.message?.includes("overloaded");
        
        if (isUnavailable && i < retries - 1) {
          console.warn(\`\${model} unavailable (503), retrying in \${Math.pow(2, i)} seconds...\`);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          continue;
        }
        
        // If it's not a retryable error, or we're out of retries for this model,
        // break out of the retry loop and try the NEXT model.
        console.warn(\`\${model} failed. \${modelsToTry.indexOf(model) < modelsToTry.length - 1 ? 'Falling back to next model...' : 'No models left.'}\`);
        break;
      }
    }
  }
  throw new Error("All AI models failed to generate content. Please try again later.");
};`;

code = code.replace(/const generateContentWithRetry = async \([\s\S]*?throw new Error\("Failed to generate content after retries"\);\n\};/, newRetryFunc);

fs.writeFileSync('server.ts', code);
console.log('Added AI fallback logic');
