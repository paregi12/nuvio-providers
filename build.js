#!/usr/bin/env node

/**
 * Build script for nuvio-providers
 * Compiles Rust scrapers in scrapers/<name>/ to WebAssembly (wasm32-unknown-unknown)
 * and copies the output .wasm binaries to providers/<name>.wasm.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers');
const outDir = path.join(__dirname, 'providers');

function getScrapersToBuild() {
    const args = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
    if (args.length > 0) return args;

    if (!fs.existsSync(scrapersDir)) {
        console.error('scrapers/ directory not found.');
        process.exit(1);
    }

    return fs.readdirSync(scrapersDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
}

function buildScraper(scraperName) {
    const scraperPath = path.join(scrapersDir, scraperName);
    if (!fs.existsSync(path.join(scraperPath, 'Cargo.toml'))) {
        console.warn(`Skipping ${scraperName}: no Cargo.toml found in scrapers/${scraperName}`);
        return false;
    }

    console.log(`Building Rust WASM scraper: ${scraperName}...`);
    try {
        execSync('cargo build --target wasm32-unknown-unknown --release', {
            cwd: scraperPath,
            stdio: 'inherit'
        });

        const targetDir = path.join(__dirname, 'target', 'wasm32-unknown-unknown', 'release');
        const localTargetDir = path.join(scraperPath, 'target', 'wasm32-unknown-unknown', 'release');

        let candidateWasm = null;
        for (const dir of [targetDir, localTargetDir]) {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir).filter(f => f.endsWith('.wasm') && !f.includes('.d'));
                for (const f of files) {
                    if (f.includes(scraperName.replace(/-/g, '_')) || f.includes(scraperName)) {
                        candidateWasm = path.join(dir, f);
                        break;
                    }
                }
            }
            if (candidateWasm) break;
        }

        if (!candidateWasm) {
            console.error(`Compiled wasm file for ${scraperName} not found in target dir`);
            return false;
        }

        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        const destFile = path.join(outDir, `${scraperName}.wasm`);
        fs.copyFileSync(candidateWasm, destFile);

        const stats = fs.statSync(destFile);
        const sizeKB = (stats.size / 1024).toFixed(1);
        console.log(`Successfully built ${destFile} (${sizeKB} KB)`);
        return true;
    } catch (err) {
        console.error(`Failed to build ${scraperName}:`, err.message);
        return false;
    }
}

function main() {
    const scrapers = getScrapersToBuild();
    console.log(`\nBuilding ${scrapers.length} WASM scraper(s)...\n`);
    let success = 0;
    for (const scraper of scrapers) {
        if (buildScraper(scraper)) success++;
    }
    console.log(`\nDone! ${success}/${scrapers.length} scrapers built.\n`);
}

main();
