const axios = require("axios");
const cheerio = require("cheerio");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const baseURL = "https://mbdecor.co.uk";
const url = `${baseURL}/shop/page/`;

const csvWriter = createCsvWriter({
  path: "mbdecor_products.csv",
  header: [
    { id: "name", title: "Product Name" },
    { id: "link", title: "Product Link" },
    { id: "description", title: "Description" },
    { id: "productCode", title: "Product Code" },
    { id: "category", title: "Category" },
    { id: "categoryLink", title: "Category Link" },
  ],
});

async function scrapeMainPage() {
  const products = [];
  const totalPages = 12; // Assuming there are 12 pages

  for (let page = 1; page <= totalPages; page++) {
    const pageUrl = `${url}${page}/`;
    try {
      const { data } = await axios.get(pageUrl);
      const $ = cheerio.load(data);

      $(".product-type-simple").each((index, element) => {
        const name = $(element)
          .find(".woocommerce-loop-product__title")
          .text()
          .trim();
        let link = $(element)
          .find("a.woocommerce-LoopProduct-link")
          .attr("href");

        if (!link.startsWith("http")) {
          link = `${baseURL}${link}`;
        }

        // Avoid duplication by using product link as a unique identifier
        if (!products.find((product) => product.link === link)) {
          products.push({ name, link });
        }
      });

      console.log(`Page ${page} scraped successfully.`);
    } catch (error) {
      console.error(`Error scraping page ${page}:`, error);
    }
  }

  for (let i = 0; i < products.length; i++) {
    const details = await scrapeDetailPage(products[i].link);
    products[i].description = details.description;
    products[i].productCode = details.productCode;
    products[i].category = details.category;
    products[i].categoryLink = details.categoryLink;
    console.log(`Product ${i + 1} details scraped successfully.`);
  }

  await csvWriter.writeRecords(products);
  console.log("Data has been extracted and saved to mbdecor_products.csv");
}

async function scrapeDetailPage(productUrl) {
  try {
    const { data } = await axios.get(productUrl);
    const $ = cheerio.load(data);

    const description = $(".woocommerce-product-details__short-description")
      .find("p")
      .text()
      .trim();
    const productCode = $(".sku_wrapper .sku").text().trim();
    const category = $(".posted_in .detail-content a").text().trim();
    let categoryLink = $(".posted_in .detail-content a").attr("href");

    if (!categoryLink.startsWith("http")) {
      categoryLink = `${baseURL}${categoryLink}`;
    }

    return { description, productCode, category, categoryLink };
  } catch (error) {
    console.error("Error scraping product detail page:", error);
    return { description: "", productCode: "", category: "", categoryLink: "" };
  }
}

scrapeMainPage();
