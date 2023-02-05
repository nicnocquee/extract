// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import * as Yup from "yup";
import puppeteer from "puppeteer";

const key = process.env.API_KEY || "abcd";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const schema = Yup.object({
    query: Yup.object({
      url: Yup.string().url().required(),
    }),
    headers: Yup.object({
      authorization: Yup.string().equals([key]).required(),
    }),
  });

  const {
    query: { url },
  } = await schema.validate(req);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url);
  await page.waitForSelector("article");
  let imagesToReturn = new Set();

  let currentSize = imagesToReturn.size;

  while (true) {
    const images = await page.$$eval("article img[srcset]", (anchors) =>
      [].map.call(anchors, (img: any) => img.src)
    );
    console.log(`Found images`, images.length);
    if (images && images.length > 0) {
      images.forEach((i) => {
        imagesToReturn.add(i);
      });
    }
    console.log(`imagestoreturn`, imagesToReturn.size);
    if (imagesToReturn.size > currentSize) {
      currentSize = imagesToReturn.size;
    } else {
      break;
    }
    try {
      console.log(`Waiting for next button`);
      await page.$eval(`article button[aria-label="Next"]`, (button) =>
        button.click()
      );
    } catch (error) {
      break;
    }

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log("waited 1 sec");
        resolve();
      }, 1000);
    });
  }

  if (imagesToReturn && imagesToReturn.size > 0) {
    return res.json(Array.from(imagesToReturn));
  }

  res.status(404).send("Image not found");
}
