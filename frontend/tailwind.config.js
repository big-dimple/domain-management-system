export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { 
    extend: {
      animation: {
        'spin': 'spin 1s linear infinite',
        'slideIn': 'slideIn 0.3s ease-out',
      },
      colors: {
        primary: {
          DEFAULT: '#0051c3',
          hover: '#0040a0',
        }
      }
    } 
  },
  plugins: []
}
