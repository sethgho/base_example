
// lru eviction alg
// size parameter
// read-through-ness, on cache miss, we do a "slow get" and update the cache, and return the value
// define a function slow_get(x:string) -> 'xx'


export interface IThingRepository {
  getThing(x: string): string | undefined
}

export interface IThingService {
  getThingSync(id: string): string;
}

interface CustomCache {
  get(id: string): string | undefined
  set(id: string, value: string): void
}

export class MemoryLruCache implements CustomCache {
  private readonly cacheSize: number;

  private readonly cache = new Map<string, string>();
  private keyAccessList = new Array<string>();

  constructor(size: number) {
    this.cacheSize = size;
  }

  get(id: string): string | undefined {
    const result = this.cache.get(id);
    if (result) {
      this.keyAccessList = [...this.keyAccessList.filter((i) => i !== id), id];
    }
    return result;
  }

  set(id: string, value: string) {
    this.cache.set(id, value);
    this.keyAccessList = [...this.keyAccessList.filter((i) => i !== id), id];
    this.evictOldest();
  }

  private evictOldest() {
    if (this.cache.size > this.cacheSize) {

      const lruKey = this.keyAccessList.length > 0 ? this.keyAccessList[0] : undefined;
      if (lruKey) {
        this.cache.delete(lruKey);
        this.keyAccessList = this.keyAccessList.filter((i) => i !== lruKey);
      }
    }
  }
}

export class ThingRepository implements IThingRepository {
  private readonly cache: CustomCache;
  private readonly thingService: IThingService;
  constructor(cache: CustomCache, service: IThingService) {
    this.cache = cache;
    this.thingService = service;
  }

  public getThing(x: string): string | undefined {
    const cachedValue = this.cache.get(x);
    if (!cachedValue) {
      try {
        const value = this.thingService.getThingSync(x);
        if (value) {
          this.cache.set(x, value);
        }
        return value;
      } catch (err) {
        // maybe log
        throw err;
      }
    }
    return cachedValue;
  }
}