// Tailwind 3: gera só as classes que aparecem no HTML e nos scripts (src/css/tailwind.css tem as diretivas).
module.exports = {
    content: ['./src/index.html', './src/js/**/*.js'],
    theme: { extend: {} },
    plugins: [],
};
