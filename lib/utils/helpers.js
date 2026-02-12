const chalk = require('chalk');

const colors = {
    primary: chalk.cyan,
    secondary: chalk.gray,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
    text: chalk.white,
    dim: chalk.dim
};

const boxStyles = {
    borderStyle: 'round',
    borderColor: 'cyan',
    padding: 1,
    margin: 1
};

function formatDate(date) {
    return new Date(date).toLocaleString();
}

function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function truncate(str, length) {
    if (str.length <= length) return str;
    return str.substring(0, length - 3) + '...';
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    colors,
    boxStyles,
    formatDate,
    sanitizeFilename,
    truncate,
    delay
};
