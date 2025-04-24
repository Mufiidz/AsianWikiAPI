class PagedData<T> {
  data: Array<T>;
  page: Page;

  constructor(data: Array<T>, page: Page) {
    this.data = data;
    this.page = page;
  }
}

class Page {
  total: number;
  size: number;
  totalPages: number;
  currentPage: number;

  constructor(total: number, size: number, page: number, currentPage: number) {
    this.total = total;
    this.size = size;
    this.totalPages = page;
    this.currentPage = currentPage;
  }
}

export { PagedData, Page };
