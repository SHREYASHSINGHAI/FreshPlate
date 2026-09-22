const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Container 1:
code = code.replace(
  '<div className="min-h-screen bg-white md:bg-gray-100 flex justify-center font-sans">',
  '<div className="h-[100dvh] bg-white md:bg-gray-100 flex justify-center font-sans overflow-hidden">'
);

// Container 2:
code = code.replace(
  '<div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl overflow-y-auto hide-scrollbar">',
  '<div className="w-full max-w-md bg-white h-full relative shadow-2xl flex flex-col">'
);

// Header:
code = code.replace(
  '<header className="px-4 py-5 bg-white border-b border-gray-100 sticky top-0 z-10 flex items-center justify-between">',
  '<header className="px-4 py-4 bg-white border-b border-gray-100 flex-shrink-0 z-10 flex items-center justify-between">'
);

// Main:
code = code.replace(
  '<main className="min-h-[calc(100vh-140px)] bg-white">',
  '<main className="flex-1 overflow-y-auto bg-white hide-scrollbar">'
);

// Nav:
code = code.replace(
  '<nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 px-4 py-3 flex justify-between items-center z-20 pb-safe">',
  '<nav className="bg-white border-t border-gray-200 px-4 py-3 flex justify-between items-center z-20 flex-shrink-0 pb-safe">'
);

fs.writeFileSync('src/App.tsx', code);
console.log('Layout patched');
