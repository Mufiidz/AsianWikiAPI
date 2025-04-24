class Drama {
  id: string | null;
  title: string | null;
  url: string | null;
  imageUrl: string | null;
  rating: number | null | undefined;
  vote: number | null | undefined;

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
    this.rating = rating || undefined;
    this.vote = vote || undefined;
  }
}

export default Drama;
