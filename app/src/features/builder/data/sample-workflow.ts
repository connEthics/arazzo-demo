import { ArazzoSpec } from '@/types/arazzo';

/**
 * Sample workflow demonstrating all builder features:
 * - Multiple steps with connections (goTo)
 * - Workflow inputs and outputs
 * - Data flow between steps ($steps.xxx.outputs.yyy)
 * - Error handling with onFailure
 * - Parameter bindings
 */

export const sampleSpec: ArazzoSpec = {
  arazzo: '1.0.1',
  info: {
    title: 'Pet Adoption Workflow',
    version: '1.0.0',
    description: 'Complete pet adoption process with search, selection, and purchase'
  },
  sourceDescriptions: [
    { name: 'petstore', url: '/openapi/petstore.yaml', type: 'openapi' }
  ],
  workflows: [
    {
      workflowId: 'adopt-pet',
      description: 'Search for available pets, select one, and complete the adoption process',
      inputs: {
        type: 'object',
        properties: {
          petType: { type: 'string', description: 'Type of pet to search for (dog, cat, etc.)' },
          maxPrice: { type: 'number', description: 'Maximum budget for adoption' },
          userId: { type: 'string', description: 'ID of the adopting user' }
        },
        required: ['petType', 'userId']
      },
      steps: [
        {
          stepId: 'search-pets',
          operationId: 'petstore.findPetsByStatus',
          description: 'Search for available pets matching criteria',
          parameters: [
            { name: 'status', in: 'query', value: 'available' }
          ],
          outputs: {
            availablePets: '$response.body',
            totalCount: '$response.body.length'
          },
          onSuccess: [
            { name: 'goto-select', type: 'goto', stepId: 'select-pet' }
          ],
          onFailure: [
            { name: 'handle-search-error', type: 'end' }
          ]
        },
        {
          stepId: 'select-pet',
          operationId: 'petstore.getPetById',
          description: 'Get detailed information about selected pet',
          parameters: [
            { name: 'petId', in: 'path', value: '$steps.search-pets.outputs.availablePets[0].id' }
          ],
          outputs: {
            selectedPet: '$response.body',
            petId: '$response.body.id',
            petName: '$response.body.name',
            price: '$response.body.price'
          },
          onSuccess: [
            { name: 'goto-order', type: 'goto', stepId: 'create-order' }
          ],
          onFailure: [
            { name: 'retry-select', type: 'retry', stepId: 'select-pet', retryAfter: 2, retryLimit: 3 }
          ]
        },
        {
          stepId: 'create-order',
          operationId: 'petstore.placeOrder',
          description: 'Create adoption order for the selected pet',
          parameters: [
            { name: 'petId', value: '$steps.select-pet.outputs.petId' },
            { name: 'quantity', value: 1 },
            { name: 'userId', value: '$inputs.userId' }
          ],
          outputs: {
            orderId: '$response.body.id',
            orderStatus: '$response.body.status',
            shipDate: '$response.body.shipDate'
          },
          onSuccess: [
            { name: 'goto-confirm', type: 'goto', stepId: 'confirm-adoption' }
          ],
          onFailure: [
            { name: 'handle-order-error', type: 'goto', stepId: 'handle-error' }
          ]
        },
        {
          stepId: 'confirm-adoption',
          operationId: 'petstore.getOrderById',
          description: 'Confirm the adoption order was processed',
          parameters: [
            { name: 'orderId', in: 'path', value: '$steps.create-order.outputs.orderId' }
          ],
          outputs: {
            confirmation: '$response.body',
            finalStatus: '$response.body.status'
          },
          successCriteria: [
            { condition: '$response.body.status == "approved"', type: 'simple' }
          ]
        },
        {
          stepId: 'handle-error',
          operationId: 'petstore.getPetById',
          description: 'Handle any errors in the adoption process',
          parameters: [
            { name: 'petId', in: 'path', value: '$steps.select-pet.outputs.petId' }
          ],
          outputs: {
            errorContext: '$response.body'
          }
        }
      ],
      outputs: {
        adoptedPetId: '$steps.select-pet.outputs.petId',
        adoptedPetName: '$steps.select-pet.outputs.petName',
        orderId: '$steps.create-order.outputs.orderId',
        status: '$steps.confirm-adoption.outputs.finalStatus'
      }
    }
  ]
};

/**
 * Minimal OAS source to support the sample workflow
 */
export const sampleSources: Record<string, any> = {
  petstore: {
    openapi: '3.0.3',
    info: { title: 'Petstore API', version: '1.0.0' },
    paths: {
      '/pet/findByStatus': {
        get: {
          operationId: 'findPetsByStatus',
          summary: 'Find pets by status',
          parameters: [
            { name: 'status', in: 'query', required: true, schema: { type: 'string', enum: ['available', 'pending', 'sold'] } }
          ],
          responses: {
            '200': {
              description: 'List of pets',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        status: { type: 'string' },
                        price: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/pet/{petId}': {
        get: {
          operationId: 'getPetById',
          summary: 'Get pet by ID',
          parameters: [
            { name: 'petId', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            '200': {
              description: 'Pet details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      status: { type: 'string' },
                      price: { type: 'number' },
                      category: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/store/order': {
        post: {
          operationId: 'placeOrder',
          summary: 'Place an order for a pet',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    petId: { type: 'integer' },
                    quantity: { type: 'integer' },
                    userId: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Order placed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      petId: { type: 'integer' },
                      status: { type: 'string' },
                      shipDate: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/store/order/{orderId}': {
        get: {
          operationId: 'getOrderById',
          summary: 'Get order by ID',
          parameters: [
            { name: 'orderId', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            '200': {
              description: 'Order details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      petId: { type: 'integer' },
                      status: { type: 'string' },
                      complete: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
