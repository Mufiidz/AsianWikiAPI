import Drama from "./drama.model";

class Upcoming {
    date: string;
    dramas: Drama[];

    constructor(date: string, dramas: Drama[]) {
        this.date = date;
        this.dramas = dramas;
    }
}

export default Upcoming