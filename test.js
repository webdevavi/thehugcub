setInterval(() => {
  console.log("hello")
}, 5000)

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

let done = false

const makedone = async () => {
  await sleep(10000)
  done = true
}

const checkStatus = () =>
  new Promise((res) => {
    setInterval(() => {
      if (done) {
        res()
      } else {
        console.log("waiting")
      }
    }, 2000)
  })

const main = async () => {
  makedone()
  await checkStatus()
  console.log("done finally")
}

main()
