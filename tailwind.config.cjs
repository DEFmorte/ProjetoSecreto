// Tailwind 3: gera src/css/tailwind.css só com as classes que aparecem no HTML e nos scripts.
// Rodado pelo `npm run dev` (modo observação), pelo `npm run build` e pelo `npm run css`.
module.exports = {
    content: ['./src/index.html', './src/js/**/*.js'],
    theme: { extend: {} },
    plugins: [],
};
