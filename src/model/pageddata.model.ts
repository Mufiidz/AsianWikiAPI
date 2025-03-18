class PagedData {
  data: Array<any>;
  page: Page;

  constructor(data: Array<any>, page: Page) {
    this.data = data;
    this.page = page;
  }
}

class Page {
  total: number;
  size: number;
  page: number;
  currentPage: number;

  constructor(total: number, size: number, page: number, currentPage: number) {
    this.total = total;
    this.size = size;
    this.page = page;
    this.currentPage = currentPage;
  }
}

export { PagedData, Page };
