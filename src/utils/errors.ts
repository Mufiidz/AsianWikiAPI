class BadRequest extends Error {
    constructor(public message: string, ) {
        super(message)
    }
}

export { BadRequest }