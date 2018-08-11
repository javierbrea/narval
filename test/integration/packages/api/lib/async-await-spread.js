'use strict'

const resolveAfter = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved')
    }, 10)
  })
}

const asyncCall = async () => resolveAfter()

const concatArrays = (array1, array2) => {
  return [...array1, ...array2]
}

const cloneObject = (object) => {
  return {...object}
}

module.exports = {
  asyncCall,
  concatArrays,
  cloneObject
}
