const fs = require('fs');
const path = require('path');

function getFiles(dir, files_ = []) {
    const files = fs.readdirSync(dir);
    for (const i in files) {
        const name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files_);
        } else {
            files_.push(name);
        }
    }
    return files_;
}

const appDir = path.resolve(__dirname, 'app');
const allFiles = getFiles(appDir);

allFiles.forEach(filePath => {
    // Only process page.tsx files that are dynamic routes (have [ in their path)
    if (filePath.endsWith('page.tsx') && filePath.includes('[')) {
        console.log(`Processing: ${filePath}`);
        
        // Extract dynamic parameter names from path (e.g. [id] -> 'id')
        const paramMatches = filePath.match(/\[([^\]]+)\]/g);
        if (!paramMatches) return;
        
        const params = paramMatches.map(m => m.replace('[', '').replace(']', ''));
        const paramObj = {};
        params.forEach(p => {
            paramObj[p] = '1'; // Dummy param value for static generation
        });
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if the client sibling page.client.tsx exists or if content contains 'use client'
        const clientFilePath = filePath.replace('page.tsx', 'page.client.tsx');
        
        if (fs.existsSync(clientFilePath) || content.includes("'use client'") || content.includes('"use client"')) {
            // If the client sibling doesn't exist yet, we copy the original file to it
            if (!fs.existsSync(clientFilePath)) {
                fs.writeFileSync(clientFilePath, content, 'utf8');
                console.log(`  -> Created client sibling: ${clientFilePath}`);
            }
            
            // Write the server component entry point (WITHOUT props to avoid dynamic check)
            const staticParamsCode = `export function generateStaticParams() {
  return [${JSON.stringify(paramObj)}];
}`;
            
            const serverCode = `import ClientPage from './page.client';

${staticParamsCode}

export default function Page() {
  return <ClientPage />;
}
`;
            fs.writeFileSync(filePath, serverCode, 'utf8');
            console.log(`  -> Rewrote server page: ${filePath}`);
        } else {
            // If it's a regular server component, append generateStaticParams
            if (!content.includes('generateStaticParams')) {
                const staticParamsCode = `\n\nexport function generateStaticParams() {
  return [${JSON.stringify(paramObj)}];
}\n`;
                fs.appendFileSync(filePath, staticParamsCode, 'utf8');
                console.log(`  -> Appended generateStaticParams to server component: ${filePath}`);
            }
        }
    }
});

console.log('All dynamic pages processed successfully!');
