#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import Replicate from 'replicate';
import figlet from 'figlet';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Display the ASCII art logo
console.log(chalk.cyan(figlet.textSync('AI-Hedgehog', { font: 'Standard' })));
console.log(chalk.cyan('Your friendly AI coding companion 🦔\n by hibernatus'));

// Configure the CLI
program
  .name('ai-hedgehog')
  .description('An open-source CLI tool that provides AI feedback on your code as you write')
  .version('0.1.0')
  .requiredOption('-d, --directory <path>', 'Directory to watch for changes')
  .option('-t, --token <token>', 'Replicate API token', process.env.REPLICATE_API_TOKEN)
  .option('-i, --ignore <patterns>', 'Comma-separated patterns to ignore', 'node_modules,dist,.git,build,.next')
  .option('-e, --extensions <exts>', 'Comma-separated file extensions to watch', '.js,.jsx,.ts,.tsx,.py,.html,.css,.go,.rs,.java,.c,.cpp,.php,.rb')
  .option('-m, --model <model>', 'Replicate model ID (e.g., "anthropic/claude-3-sonnet-20240229")', 'anthropic/claude-3.7-sonnet')
  .option('-s, --system <prompt>', 'Custom system prompt', 'You are an expert senior polyglot software developer, architect and engineer providing feedback suggestions etc.')
  .option('-v, --verbose', 'Enable verbose logging')
  .parse(process.argv);

const options = program.opts();
const verbose = options.verbose;

// Validate API token
if (!options.token) {
  console.error(chalk.red('Error: Replicate API token is required. Provide it with --token or set REPLICATE_API_TOKEN environment variable.'));
  console.log(chalk.yellow('Get your token at https://replicate.com/account/api-tokens'));
  process.exit(1);
}

// Initialize Replicate client
const replicate = new Replicate({
  auth: options.token,
});

// Set up the file watcher
const watchDir = path.resolve(options.directory);
const ignoredPatterns = options.ignore.split(',');
const watchExtensions = options.extensions.split(',');

console.log(chalk.blue(`🔍 Watching directory: ${watchDir}`));
console.log(chalk.blue(`🚫 Ignoring: ${ignoredPatterns.join(', ')}`));
console.log(chalk.blue(`👁️  Watching file types: ${watchExtensions.join(', ')}`));
console.log(chalk.blue(`🤖 Using model: ${options.model}`));

// Create a debounce function to avoid processing the same file multiple times
const debounce = (func, wait) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

// Create the watcher
const watcher = chokidar.watch(watchDir, {
  ignored: [
    /(^|[\/\\])\../, // Ignore dotfiles
    ...ignoredPatterns.map(pattern => new RegExp(pattern))
  ],
  persistent: true,
  ignoreInitial: true, // Don't process existing files on startup by default
  awaitWriteFinish: {
    stabilityThreshold: 2000, // Wait for file to be stable for 2 seconds
    pollInterval: 100
  }
});

// Function to get file extension
const getFileExtension = (filename) => {
  return path.extname(filename);
};

// Function to send file content to Replicate API with real-time streaming
async function getAIFeedback(filePath, fileContent) {
  const spinner = ora('Preparing AI feedback...').start();
  
  try {
    // Prepare the input for the model
    const input = {
      prompt: fileContent,
      system_prompt: options.system,
      max_tokens: 4096
    };

    if (verbose) {
      console.log(chalk.gray(`Sending request to Replicate for ${filePath} using model ${options.model}...`));
    }

    spinner.stop();
    
    // Create a box for the streaming output
    console.log(boxen(chalk.cyan('AI Feedback (streaming)...'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      title: `AI Feedback for ${path.basename(filePath)}`,
      titleAlignment: 'center'
    }));
    
    // Use the streaming API to get feedback and display in real-time
    console.log(chalk.green(''));  // Start with a new line
    
    for await (const event of replicate.stream(options.model, { input })) {
      // Print each chunk as it arrives
      const chunk = event.toString();
      process.stdout.write(chunk);
    }
    
    console.log('\n');  // End with a new line
    
    if (verbose) {
      console.log(chalk.gray(`\nCompleted AI feedback for ${filePath}`));
    }
    
    return true;  // We don't need to return the feedback as it's already displayed
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error getting AI feedback:'), error.message);
    return false;
  }
}

// Function to process a file (used for both new and changed files)
const processFile = async (filePath, eventType) => {
  const extension = getFileExtension(filePath);
  
  // Check if we should process this file type
  if (!watchExtensions.includes(extension)) {
    if (verbose) {
      console.log(chalk.gray(`Skipping ${filePath} (extension not in watch list)`));
    }
    return;
  }
  
  console.log(chalk.yellow(`\n📝 File ${eventType}: ${filePath}`));
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(watchDir, filePath);
    
    // Prepare the prompt with file information
    const prompt = `
File: ${relativePath}
Content:
\`\`\`${extension.replace('.', '')}
${fileContent}
\`\`\`

Please provide feedback on this code, including:
1. Potential bugs or issues
2. Optimization suggestions
3. Best practices recommendations
4. Any other helpful insights
`;
    
    await getAIFeedback(filePath, prompt);
  } catch (error) {
    console.error(chalk.red(`Error processing ${filePath}:`), error.message);
  }
};

// Debounced version of processFile to avoid multiple rapid calls
const debouncedProcessFile = debounce(processFile, 500);

// Handle file changes
watcher.on('change', (filePath) => {
  debouncedProcessFile(filePath, 'changed');
});

// Handle new files
watcher.on('add', (filePath) => {
  // Only process new files after the initial scan is complete
  if (watcher.isReady) {
    debouncedProcessFile(filePath, 'added');
  }
});

// Handle errors
watcher.on('error', error => {
  console.error(chalk.red('Watcher error:'), error);
});

// Log when ready
watcher.on('ready', () => {
  console.log(chalk.green('✅ AI-Hedgehog is ready! Save a file to get feedback.'));
});

// Handle exit
process.on('SIGINT', () => {
  watcher.close();
  console.log(chalk.yellow('\n👋 AI-Hedgehog stopped.'));
  process.exit(0);
});
