const { decode } = require("html-entities")

console.log(decode("&copy; hey there wooho", { level: "html5" }))
