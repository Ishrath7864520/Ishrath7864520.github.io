const fs = require('fs');

// Function to read validation data from JSON file
function readValidationData() {
    try {
        const validationData = JSON.parse(fs.readFileSync('src/validation1.json'));
        return validationData;
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}

// Function to validate repository details
function validateRepo(owner, repoName) {
    try {
        // Read validation data
        const validationData = readValidationData();

        // Check if the repository name exists in the validation data
        const repoDetails = validationData.find(repo => repo.name === repoName);
        if (repoDetails) {
            console.log(`Repository '${repoName}' is present in the validation data.`);
        } else {
            console.log(`Repository '${repoName}' is not present in the validation data.`);
            process.exit(1);
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Usage example
const owner = process.argv[2];
const repoName = process.argv[3];

if (!owner) {
    console.error('Error: Please provide the owner name as a command-line argument.');
    process.exit(1);
}

if (!repoName) {
    console.error('Error: Please provide the repository name as a command-line argument.');
    process.exit(1);
}

// Validate the repository details
validateRepo(owner, repoName);
