export const mockFunctions = {
  createExecution: jest.fn().mockResolvedValue({
    response: "mocked response"
  })
};

export const mockClient = {
  setEndpoint: jest.fn(),
  setProject: jest.fn()
};
