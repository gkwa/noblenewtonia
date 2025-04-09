# Use `just <recipe>` to run a recipe

# List available recipes
default:
    @just --list

# Install dependencies
install:
    pnpm install

# Make executable
make-executable:
    chmod +x src/index.js

# Install as CLI command
install-cli: make-executable
    pnpm link --global

# Uninstall the global CLI
uninstall:
    pnpm unlink --global noblenewtonia

# Run the application
run *ARGS:
    node src/index.js {{ ARGS }}

# Run the application with hot reloading
dev *ARGS:
    nodemon src/index.js {{ ARGS }}

# Run tests
test:
    pnpm test

# Lint code
lint:
    pnpm lint

# Install as global executable
install-global: make-executable
    pnpm install -g .

# Create a sample compressed file for testing
create-test-data:
    echo 'Hello from Noble Newtonia!' | node -e "const pako = require('pako'); process.stdin.on('data', data => { const compressed = pako.deflate(data.toString()); process.stdout.write(compressed); });" > test-data.deflate

# Create a sample batch file for testing
create-batch-test:
    node scripts/create-test-batch.js

# Create a sample JSON file for testing
create-json-test:
    node scripts/create-test-json.js

# Test the application with sample data
test-run: create-test-data
    cat test-data.deflate | just run > test-output.txt
    cat test-output.txt
    rm test-output.txt

# Test batch processing with sample data - output to files
test-batch: create-batch-test
    just run batch -i test-data/batch-test.txt -o test-output -v
    ls -la test-output

# Test batch processing with stdout
test-batch-stdout: create-batch-test
    just run batch -i test-data/batch-test.txt -o - > test-stdout.txt
    cat test-stdout.txt
    rm test-stdout.txt

# Test batch processing with custom separator
test-batch-separator: create-batch-test
    just run batch -i test-data/batch-test.txt -o - --separator "\n=====\n" > test-stdout-sep.txt
    cat test-stdout-sep.txt
    rm test-stdout-sep.txt

# Test JSON processing - output to stdout
test-json-stdout: create-json-test
    just run parse-json -i test-data/test-json.json -o - > test-json-output.yaml
    cat test-json-output.yaml
    rm test-json-output.yaml

# Test JSON processing (old format) - output to stdout
test-json-old-stdout: create-json-test
    just run parse-json -i test-data/test-json-old.json -o - > test-json-old-output.yaml
    cat test-json-old-output.yaml
    rm test-json-old-output.yaml

# Test JSON from stdin - pipe JSON to the command
test-json-stdin: create-json-test
    cat test-data/test-json.json | just run parse-json -o - > test-json-stdin.yaml
    cat test-json-stdin.yaml
    rm test-json-stdin.yaml

# Test JSON processing - output to single file
test-json-file: create-json-test
    just run parse-json -i test-data/test-json.json -o test-data/output.yaml
    cat test-data/output.yaml

# Test JSON processing - output to directory (separate files)
test-json-dir: create-json-test
    just run parse-json -i test-data/test-json.json -o test-json-output
    ls -la test-json-output

# Benchmark performance with a larger file
benchmark:
    node src/benchmark/index.js

# Clean generated files
clean:
    rm -f test-data.deflate
    rm -rf test-data test-output test-json-output
    rm -f test-stdout.txt test-stdout-sep.txt test-json-output.yaml test-json-old-output.yaml test-json-stdin.yaml
