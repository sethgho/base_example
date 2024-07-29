import { IThingRepository, MemoryLruCache, ThingRepository } from "../src"

const SIZE = 1;
describe("MemoryLruCache", () => {
  let cache: MemoryLruCache;

  beforeEach(() => {
    cache = new MemoryLruCache(SIZE);
  })

  it("returns nothing when empty", () => {
    expect(cache.get("test")).toBeUndefined();
  })

  it("returns the written value", () => {
    cache.set("id", "value")
    expect(cache.get("id")).toEqual("value");
  })

  it("evicts the first value when size is exceeded", () => {
    cache.set("1", "one");
    cache.get("1");
    cache.set("2", "two");
    cache.get("2");

    expect(cache.get("1")).toBeUndefined();
  })

  it("evicts the first written value when none have been accessed", () => {
    cache.set("1", "one");
    cache.set("2", "two");

    expect(cache.get("1")).toBeUndefined();
  })

  describe("thread safety", () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    test('should handle concurrent set operations correctly', async () => {
      // This test fails!
      // In order to add considerations for thread safety,
      // I would need to do a bit of refactoring that would shift
      // this implementation further away from the example code
      // I wrote while on the call with Allan. It would look something like this:
      //
      // - modify the CustomCache interface to be async.
      // - add a simple boolean mutex lock member to the class
      // - wrap all operations in an awaited call to an acquireLock function w/ a subsequent releaseLock call.

      const cacheSize = 5;
      const cache = new MemoryLruCache(cacheSize);

      const operations = [
        async () => { cache.set('a', '1'); await delay(10); },
        async () => { cache.set('b', '2'); await delay(20); },
        async () => { cache.set('c', '3'); await delay(30); },
        async () => { cache.set('d', '4'); await delay(40); },
        async () => { cache.set('e', '5'); await delay(50); },
        async () => { cache.set('f', '6'); await delay(60); },
        async () => { cache.set('g', '7'); await delay(70); },
      ];

      await Promise.all(operations.map(op => op()));

      expect(cache.get('a')).toBeUndefined(); // 'a' should be evicted
      expect(cache.get('b')).toBeUndefined(); // 'b' should be evicted
      expect(cache.get('c')).toBeUndefined(); // 'c' should be evicted
      expect(cache.get('d')).toBe('4');
      expect(cache.get('e')).toBe('5');
      expect(cache.get('f')).toBe('6');
      expect(cache.get('g')).toBe('7');
    });

    test('should handle concurrent get operations correctly', async () => {
      const cacheSize = 3;
      const cache = new MemoryLruCache(cacheSize);

      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      const operations = [
        async () => { expect(cache.get('a')).toBe('1'); await delay(10); },
        async () => { expect(cache.get('b')).toBe('2'); await delay(20); },
        async () => { expect(cache.get('c')).toBe('3'); await delay(30); },
      ];

      await Promise.all(operations.map(op => op()));
    });

    test('should evict the least recently used item', async () => {
      const cacheSize = 3;
      const cache = new MemoryLruCache(cacheSize);

      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.get('a'); // Access 'a' to make it recently used
      cache.set('d', '4'); // This should evict 'b', not 'a'

      expect(cache.get('a')).toBe('1');
      expect(cache.get('b')).toBeUndefined(); // 'b' should be evicted
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });
  })
})

describe("ThingRepository", () => {
  let repo: IThingRepository;
  const mockServiceCall = jest.fn();


  beforeEach(() => {
    const cache = new MemoryLruCache(3);
    repo = new ThingRepository(cache, {
      getThingSync: mockServiceCall
    });
  })

  it("throws the underlying service call's error", () => {
    mockServiceCall.mockImplementation(() => {
      throw new Error("Example error");
    });
    expect(() => {
      repo.getThing("1")
    }).toThrow(new Error("Example error"))
  });

  it("performs a service call on cache miss", () => {
    const id = "1";
    mockServiceCall.mockReturnValue("11");

    expect(repo.getThing(id)).toEqual("11");
  });

  it("skips slow call on cache hit", () => {
    const id = "1";
    mockServiceCall.mockReturnValue("11");
    expect(repo.getThing(id)).toEqual("11");
    mockServiceCall.mockReset();

    expect(repo.getThing(id)).toEqual("11");
    expect(mockServiceCall).not.toHaveBeenCalled();
  });


  it("passes Allan's example scenario", () => {
    const largerStore = new ThingRepository(new MemoryLruCache(2), {
      getThingSync: mockServiceCall
    })
    mockServiceCall.mockImplementation((id) => (`${id}${id}`))

    expect(largerStore.getThing("x")).toEqual("xx")
    expect(largerStore.getThing("y")).toEqual("yy")
    expect(largerStore.getThing("z")).toEqual("zz")
    expect(largerStore.getThing("x")).toEqual("xx")

    expect(mockServiceCall).toHaveBeenCalledTimes(4);
  })
})