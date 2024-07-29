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