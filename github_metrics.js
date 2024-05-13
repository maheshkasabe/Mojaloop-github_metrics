const { Octokit } = require('@octokit/rest');
const fs = require('fs');

const GITHUB_TOKEN = "";
// Initialize Octokit with GitHub token
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Define groups
const groups = {
    personal: ['Lets-Meet-Devops', 'K-Dash', 'Microservice-Bug-Tracker'], // Example: Repositories related to your personal projects
    // Add more groups as needed
};

async function getRepositories() {
    try {
        // Fetch all repositories for the authenticated user (you)
        const response = await octokit.repos.listForAuthenticatedUser({
            per_page: 100, // Increase if more repositories
        });

        // Check if the response data exists and is an array
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(repo => repo.name);
        } else {
            throw new Error('Failed to fetch repositories: Invalid response format');
        }
    } catch (error) {
        console.error('Error fetching repositories:', error);
        throw error; // Rethrow the error to be caught by the caller
    }
}

async function getRepositoryMetrics(owner,repo) {
    // Fetch contributors
    const contributorsResponse = await octokit.repos.listContributors({
        owner: owner, // Replace 'maheshkasabe' with your GitHub username
        repo: repo,
    });
    const contributors = contributorsResponse.data.length;

    // Fetch commits
    const commitsResponse = await octokit.repos.listCommits({
        owner: owner, // Replace 'maheshkasabe' with your GitHub username
        repo: repo,
    });
    const commits = commitsResponse.data.length;

    // Fetch code frequency
    const codeFrequencyResponse = await octokit.request('GET /repos/{owner}/{repo}/stats/code_frequency' ,{
        owner: owner, // Replace 'maheshkasabe' with your GitHub username
        repo: repo,
    });
    const codeFrequency = codeFrequencyResponse.data;

    // Calculate lines of code
    let linesOfCode = 0;
    if (Array.isArray(codeFrequency) && codeFrequency.length > 0) {
        codeFrequency.forEach(week => {
            linesOfCode += week[1] - week[2];
        });
    } else {
        console.error('Code frequency data format unexpected or empty:', codeFrequency);
    }

    // Fetch dependencies (if applicable)
    // You would need to use additional tools or APIs to fetch dependency information

    return {
        contributors: contributors,
        commits: commits,
        linesOfCode: linesOfCode,
        dependencies: [], // Placeholder for dependencies (to be implemented)
    };
}

async function generateMetricsReport() {
    const repositories = await getRepositories();

    // Initialize metrics object for each group
    const groupMetrics = {};
    Object.keys(groups).forEach(group => {
        groupMetrics[group] = {
            totalContributors: 0,
            totalCommits: 0,
            totalLinesOfCode: 0,
            totalRepositories: 0,
            totalDependencies: 0,
        };
    });

    // Iterate through repositories
    for (const repo of repositories) {
        // Determine which group the repository belongs to
        for (const [group, keywords] of Object.entries(groups)) {
            if (keywords.some(keyword => repo.toLowerCase().includes(keyword.toLowerCase()))) {
                // Get metrics for the repository
                const owner = "maheshkasabe";
                const metrics = await getRepositoryMetrics(owner,repo); // Pass repository name
                // Update group metrics
                groupMetrics[group].totalContributors += metrics.contributors;
                groupMetrics[group].totalCommits += metrics.commits;
                groupMetrics[group].totalLinesOfCode += metrics.linesOfCode;
                groupMetrics[group].totalRepositories++;
            }
        }
    }

    // Generate markdown report
    let markdownReport = '# GitHub Metrics Report\n\n';
    Object.entries(groupMetrics).forEach(([group, metrics]) => {
        markdownReport += `## ${group} Group\n\n`;
        markdownReport += `- Total Repositories: ${metrics.totalRepositories}\n`;
        markdownReport += `- Total Contributors: ${metrics.totalContributors}\n`;
        markdownReport += `- Total Commits: ${metrics.totalCommits}\n`;
        markdownReport += `- Total Lines of Code: ${metrics.totalLinesOfCode}\n`;
        markdownReport += `- Total Dependencies: ${metrics.totalDependencies}\n\n`;
    });

    // Write report to file
    fs.writeFileSync('metrics_report.md', markdownReport);
}

generateMetricsReport().catch(error => {
    console.error('Error generating metrics report:', error);
    process.exit(1);
});
