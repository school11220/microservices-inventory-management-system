import { Injectable, Logger } from '@nestjs/common';
import type { ProductSummary } from '@inventory/contracts';
import { ProductQueryDto } from './dto/product-query.dto';

interface SearchHit {
  _source?: ProductSummary;
}

interface SearchResponse {
  hits?: {
    total?: number | { value?: number };
    hits?: SearchHit[];
  };
  aggregations?: {
    categories?: {
      buckets?: Array<{ key: string; doc_count: number }>;
    };
  };
}

@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);
  private indexReady = false;

  get enabled() {
    return ['opensearch', 'elastic', 'elasticsearch'].includes(
      (process.env.SEARCH_BACKEND ?? '').toLowerCase(),
    );
  }

  async search(query: ProductQueryDto) {
    if (!this.enabled) return undefined;
    try {
      await this.ensureIndex();
      const size = query.limit;
      const from = (query.page - 1) * query.limit;
      const response = await this.request<SearchResponse>('_search', {
        method: 'POST',
        body: {
          from,
          size,
          query: {
            bool: {
              must: query.search
                ? [
                    {
                      multi_match: {
                        query: query.search,
                        fields: ['name^3', 'category^2', 'description'],
                        fuzziness: 'AUTO',
                      },
                    },
                  ]
                : [{ match_all: {} }],
              filter: query.category ? [{ term: { 'category.keyword': query.category } }] : [],
            },
          },
          sort: [{ updatedAt: { order: 'desc' } }],
          aggs: {
            categories: { terms: { field: 'category.keyword', size: 25 } },
          },
        },
      });
      const total =
        typeof response.hits?.total === 'number'
          ? response.hits.total
          : Number(response.hits?.total?.value ?? 0);
      return {
        products: (response.hits?.hits ?? [])
          .map((hit) => hit._source)
          .filter((product): product is ProductSummary => Boolean(product)),
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        facets: {
          categories: (response.aggregations?.categories?.buckets ?? []).map((bucket) => ({
            category: bucket.key,
            count: bucket.doc_count,
          })),
        },
      };
    } catch (error) {
      this.logger.warn(
        `Search backend unavailable, falling back to PostgreSQL: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return undefined;
    }
  }

  async index(product: ProductSummary) {
    if (!this.enabled) return;
    try {
      await this.ensureIndex();
      await this.request(`_doc/${product.id}`, { method: 'PUT', body: product });
    } catch (error) {
      this.logger.warn(
        `Product search indexing failed for ${product.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async delete(id: string) {
    if (!this.enabled) return;
    try {
      await this.request(`_doc/${id}`, { method: 'DELETE' });
    } catch {
      // OpenSearch returns 404 when a document was already absent; CRUD should not fail for that.
    }
  }

  private async ensureIndex() {
    if (this.indexReady) return;
    const response = await fetch(this.indexUrl, { method: 'HEAD' });
    if (response.status === 404) {
      await this.request('', {
        method: 'PUT',
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'text' },
              description: { type: 'text' },
              category: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              price: { type: 'double' },
              stockLevel: { type: 'integer' },
              reorderThreshold: { type: 'integer' },
              imageUrl: { type: 'keyword', index: false },
              version: { type: 'integer' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
    } else if (!response.ok) {
      throw new Error(`Search index check failed with HTTP ${response.status}`);
    }
    this.indexReady = true;
  }

  private async request<T = unknown>(
    path: string,
    options: { method: string; body?: unknown },
  ): Promise<T> {
    const response = await fetch(`${this.indexUrl}${path ? `/${path}` : ''}`, {
      method: options.method,
      headers: { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Search backend returned HTTP ${response.status}`);
    }
    if (response.status === 404 || response.status === 204) {
      return {} as T;
    }
    return (await response.json()) as T;
  }

  private get indexUrl() {
    const baseUrl = process.env.OPENSEARCH_URL ?? process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
    const index = process.env.PRODUCT_SEARCH_INDEX ?? 'inventory-products';
    return `${baseUrl.replace(/\/$/, '')}/${index}`;
  }
}
