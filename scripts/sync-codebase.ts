#!/usr/bin/env node

/**
 * Script to populate the frontend_code_files table with all source files
 * Run this script to sync the entire codebase to the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getLanguageFromPath(path: string): string {
  if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 'typescript';
  if (path.endsWith('.ts')) return 'typescript';
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  return 'text';
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      // Skip node_modules and hidden directories
      if (!file.startsWith('.') && file !== 'node_modules') {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      // Only include source files
      if (
        file.endsWith('.tsx') ||
        file.endsWith('.ts') ||
        file.endsWith('.jsx') ||
        file.endsWith('.js') ||
        file.endsWith('.css')
      ) {
        // Skip declaration files
        if (!file.endsWith('.d.ts')) {
          arrayOfFiles.push(filePath);
        }
      }
    }
  });

  return arrayOfFiles;
}

async function syncCodebase() {
  console.log('🔍 Scanning codebase...');
  
  const srcDir = join(process.cwd(), 'src');
  const allFiles = getAllFiles(srcDir);
  
  console.log(`📁 Found ${allFiles.length} source files`);

  const filesToSync = allFiles.map((filePath) => {
    const relativePath = relative(process.cwd(), filePath);
    const content = readFileSync(filePath, 'utf-8');
    const language = getLanguageFromPath(filePath);

    return {
      file_path: relativePath,
      content,
      language,
    };
  });

  console.log('📤 Uploading to database...');

  // Batch upsert in chunks of 50
  const chunkSize = 50;
  for (let i = 0; i < filesToSync.length; i += chunkSize) {
    const chunk = filesToSync.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('frontend_code_files')
      .upsert(chunk, { onConflict: 'file_path' });

    if (error) {
      console.error(`❌ Error uploading chunk ${i / chunkSize + 1}:`, error);
    } else {
      console.log(`✅ Uploaded chunk ${i / chunkSize + 1} (${chunk.length} files)`);
    }
  }

  console.log('✨ Sync complete!');
}

syncCodebase().catch(console.error);
