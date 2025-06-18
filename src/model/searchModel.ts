class Search {
  id: string;
  title: string;
  type: string | null;
  url: string | null;
  imageUrl: string | null;
  
  constructor(
    id: string,
    title: string,
    type?: string,
    url?: string,
    imageUrl?: string
  ) {
    this.id = id;
    this.title = title;
    this.type = type || null;
    this.url = url || null;
    this.imageUrl = imageUrl || null;
  }
}

export default Search;
