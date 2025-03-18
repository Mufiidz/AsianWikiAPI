class Drama {
  id: string | null;
  title: string | null;
  url: string | null;
  imageUrl: string | null;
  rating: number | null;
  vote: number | null;

  constructor(
    id?: string,
    title?: string,
    url?: string,
    imageUrl?: string,
    rating?: number,
    vote?: number
  ) {
    this.id = id || null;
    this.title = title || null;
    this.url = url || null;
    this.imageUrl = imageUrl || null;
    this.rating = rating || null;
    this.vote = vote || null;
  }
}

export default Drama;
