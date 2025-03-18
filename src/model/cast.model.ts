class Cast {
  id: string | null;
  name: string | null;
  profileUrl: string | null;
  imageUrl: string | null;
  cast: string | null;

  constructor(
    id?: string,
    name?: string,
    profileUrl?: string,
    imageUrl?: string,
    as?: string
  ) {
    this.id = id || null;
    this.name = name || null;
    this.profileUrl = profileUrl || null;
    this.imageUrl = imageUrl || null;
    this.cast = as || null;
  }
}

export default Cast;
