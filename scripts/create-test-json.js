#!/usr/bin/env node

/**
 * Script to create a test JSON file with base64 encoded compressed content
 */

import { deflate } from "pako"
import fs from "fs"
import path from "path"

// Sample data to encode
const samples = [
  {
    name: "365 by Whole Foods Market, Assorted Entertaining Crackers, 8.8 Ounce",
    html: "<h1>Product Details</h1><p>These entertaining crackers are perfect for cheese platters and appetizers.</p>",
  },
  {
    name: "365 by Whole Foods Market, Cracker Cracked Wheat, 10.6 Ounce",
    html: "<h1>Product Information</h1><p>Whole grain crackers made with cracked wheat and sea salt.</p>",
  },
  {
    name: "365 by Whole Foods Market, Cracker Pita Sea Salt, 5 Ounce",
    html: "<h1>About This Item</h1><p>Crispy pita crackers made with organic ingredients and sea salt.</p>",
  },
]

// Create output directory if it doesn't exist
const outputDir = path.join(process.cwd(), "test-data")
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Create both old and new format JSON files for testing

// 1. Old format (flat array)
const oldFormatFile = path.join(outputDir, "test-json-old.json")
const jsonItemsOld = samples.map((sample) => {
  // Compress with pako deflate
  const compressed = deflate(sample.html)

  // Convert to Buffer and encode as base64
  const base64 = Buffer.from(compressed).toString("base64")

  return {
    rawHtml: base64,
    name: sample.name,
  }
})

// Write old format file
fs.writeFileSync(oldFormatFile, JSON.stringify(jsonItemsOld, null, 2))
console.log(`Created old format test JSON file at: ${oldFormatFile}`)

// 2. New format (nested structure)
const newFormatFile = path.join(outputDir, "test-json.json")
const jsonItemsNew = {
  Items: samples.map((sample, index) => {
    // Compress with pako deflate
    const compressed = deflate(sample.html)

    // Convert to Buffer and encode as base64
    const base64 = Buffer.from(compressed).toString("base64")

    return {
      category: {
        Value: "crackers",
      },
      domain: {
        Value: "www.amazon.com",
      },
      entity_type: {
        Value: "category",
      },
      id: {
        Value: `test-id-${Math.floor(Math.random() * 1000)}`,
      },
      imageUrl: {
        Value: "https://example.com/image.jpg",
      },
      isSponsored: {
        Value: index === 1, // Make the second item sponsored
      },
      name: {
        Value: sample.name,
      },
      originalPrice: {
        Value: "$5.99",
      },
      price: {
        Value: "$4.99",
      },
      rawHtml: {
        Value: base64,
      },
      rawTextContent: {
        Value: `Plain text version of ${sample.name}`,
      },
      shipping: {
        Value: "Free shipping with Prime",
      },
      timestamp: {
        Value: new Date().toISOString(),
      },
      ttl: {
        Value: (Math.floor(Date.now() / 1000) + 86400).toString(),
      },
      url: {
        Value: `https://example.com/product-${index + 1}`,
      },
    }
  }),
  Count: samples.length,
  ScannedCount: samples.length,
}

// Write new format file
fs.writeFileSync(newFormatFile, JSON.stringify(jsonItemsNew, null, 2))
console.log(`Created new format test JSON file at: ${newFormatFile}`)
console.log(`Both files contain ${samples.length} items with base64-encoded compressed HTML`)
