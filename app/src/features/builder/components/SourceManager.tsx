'use client';

import { useState, useMemo } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { Card } from '@/components/primitives';
import yaml from 'js-yaml';
import type { ArazzoSpec } from '@/types/arazzo';

type ImportMode = 'url' | 'paste';

interface SourceManagerProps {
  onStepAdded?: () => void;
}

export default function SourceManager({ onStepAdded }: SourceManagerProps) {
  const { state, dispatch } = useBuilder();
  
  // Calculate which sources are used in the workflow
  const usedSources = useMemo(() => {
    const used = new Set<string>();
    state.spec.workflows.forEach(wf => {
      wf.steps.forEach(step => {
        if (step.operationId) {
          // operationId format is "sourceName.operationId"
          const parts = step.operationId.split('.');
          if (parts.length > 1) {
            used.add(parts[0]);
          }
        }
      });
    });
    // Also check sourceDescriptions
    state.spec.sourceDescriptions.forEach(sd => {
      if (state.sources[sd.name]) {
        // Source is referenced in spec
      }
    });
    return used;
  }, [state.spec, state.sources]);
  const [url, setUrl] = useState('');
  const [pastedSpec, setPastedSpec] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('url');
  const [error, setError] = useState<string | null>(null);

  const handleLoadSample = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch the Arazzo workflow from public/workflows
      const workflowResponse = await fetch('/workflows/pet-adoption.arazzo.yaml');
      const workflowYaml = await workflowResponse.text();
      const spec = yaml.load(workflowYaml) as ArazzoSpec;

      // Fetch the OpenAPI source referenced in the workflow
      const sources: Record<string, any> = {};
      for (const sourceDesc of spec.sourceDescriptions || []) {
        try {
          // Resolve relative URL (./openapi/petstore.yaml -> /openapi/petstore.yaml)
          const sourceUrl = sourceDesc.url.startsWith('./') 
            ? sourceDesc.url.substring(1) 
            : sourceDesc.url;
          const sourceResponse = await fetch(sourceUrl);
          const sourceYaml = await sourceResponse.text();
          sources[sourceDesc.name] = yaml.load(sourceYaml);
        } catch (err) {
          console.warn(`Failed to load source ${sourceDesc.name}:`, err);
        }
      }

      dispatch({
        type: 'LOAD_SAMPLE',
        payload: { spec, sources }
      });
    } catch (err) {
      console.error('Failed to load sample workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sample workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const parseSpec = (content: string): any => {
    // Try JSON first
    try {
      return JSON.parse(content);
    } catch {
      // Try YAML
      return yaml.load(content);
    }
  };

  const handleUrlImport = async () => {
    if (!url) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      const text = await response.text();
      const content = parseSpec(text);
      
      if (!content.openapi && !content.swagger) {
        throw new Error('Invalid OpenAPI specification');
      }
      
      const name = content.info?.title?.replace(/\s+/g, '-') || `source-${Object.keys(state.sources).length + 1}`;
      
      dispatch({ 
        type: 'ADD_SOURCE', 
        payload: { name, content } 
      });
      setUrl('');
    } catch (err) {
      console.error('Failed to load OAS', err);
      setError(err instanceof Error ? err.message : 'Failed to load OpenAPI definition');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteImport = () => {
    if (!pastedSpec.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const content = parseSpec(pastedSpec);
      
      if (!content.openapi && !content.swagger) {
        throw new Error('Invalid OpenAPI specification. Must contain "openapi" or "swagger" field.');
      }
      
      const name = content.info?.title?.replace(/\s+/g, '-') || `source-${Object.keys(state.sources).length + 1}`;
      
      dispatch({ 
        type: 'ADD_SOURCE', 
        payload: { name, content } 
      });
      setPastedSpec('');
    } catch (err) {
      console.error('Failed to parse OAS', err);
      setError(err instanceof Error ? err.message : 'Failed to parse OpenAPI definition');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = () => {
    // Load Rich Petstore API
    dispatch({
      type: 'ADD_SOURCE',
      payload: { 
        name: 'petstore', 
        content: { 
          openapi: '3.0.3', 
          info: { title: 'Pet Store API', version: '1.0.0', description: 'A sample Pet Store API' },
          paths: {
            '/pets': { 
              get: { 
                operationId: 'listPets', 
                tags: ['Pets'], 
                summary: 'List all pets',
                description: 'Returns all pets from the system that the user has access to'
              },
              post: { 
                operationId: 'createPet', 
                tags: ['Pets'], 
                summary: 'Create a new pet',
                description: 'Creates a new pet in the store'
              }
            },
            '/pets/{petId}': { 
              get: { 
                operationId: 'getPetById', 
                tags: ['Pets'], 
                summary: 'Get pet by ID',
                description: 'Returns a single pet'
              },
              put: { 
                operationId: 'updatePet', 
                tags: ['Pets'], 
                summary: 'Update an existing pet',
                description: 'Update pet details'
              },
              delete: { 
                operationId: 'deletePet', 
                tags: ['Pets'], 
                summary: 'Delete a pet',
                description: 'Deletes a pet from the store'
              }
            },
            '/pets/{petId}/photos': { 
              get: { 
                operationId: 'getPetPhotos', 
                tags: ['Pets'], 
                summary: 'Get pet photos',
                description: 'Returns all photos for a pet'
              },
              post: { 
                operationId: 'uploadPetPhoto', 
                tags: ['Pets'], 
                summary: 'Upload pet photo',
                description: 'Upload a new photo for a pet'
              }
            },
            '/store/inventory': { 
              get: { 
                operationId: 'getInventory', 
                tags: ['Store'], 
                summary: 'Get store inventory',
                description: 'Returns pet inventories by status'
              }
            },
            '/store/orders': { 
              get: { 
                operationId: 'listOrders', 
                tags: ['Store'], 
                summary: 'List all orders',
                description: 'Returns all store orders'
              },
              post: { 
                operationId: 'placeOrder', 
                tags: ['Store'], 
                summary: 'Place an order',
                description: 'Place a new order for a pet'
              }
            },
            '/store/orders/{orderId}': { 
              get: { 
                operationId: 'getOrderById', 
                tags: ['Store'], 
                summary: 'Get order by ID',
                description: 'Find purchase order by ID'
              },
              delete: { 
                operationId: 'deleteOrder', 
                tags: ['Store'], 
                summary: 'Delete order',
                description: 'Delete purchase order by ID'
              }
            },
            '/users': { 
              post: { 
                operationId: 'createUser', 
                tags: ['Users'], 
                summary: 'Create user',
                description: 'Create a new user account'
              }
            },
            '/users/login': { 
              post: { 
                operationId: 'loginUser', 
                tags: ['Users'], 
                summary: 'User login',
                description: 'Logs user into the system'
              }
            },
            '/users/logout': { 
              post: { 
                operationId: 'logoutUser', 
                tags: ['Users'], 
                summary: 'User logout',
                description: 'Logs out current logged in user session'
              }
            },
            '/users/{username}': { 
              get: { 
                operationId: 'getUserByName', 
                tags: ['Users'], 
                summary: 'Get user by name',
                description: 'Get user by username'
              },
              put: { 
                operationId: 'updateUser', 
                tags: ['Users'], 
                summary: 'Update user',
                description: 'Update user details'
              },
              delete: { 
                operationId: 'deleteUser', 
                tags: ['Users'], 
                summary: 'Delete user',
                description: 'Delete user account'
              }
            }
          }
        } 
      }
    });
    
    // Load Magento E-Commerce API
    dispatch({
      type: 'ADD_SOURCE',
      payload: { 
        name: 'magento-ecommerce', 
        content: { 
          openapi: '3.0.3', 
          info: { title: 'Magento E-Commerce API', version: '2.4.0', description: 'Magento-style e-commerce API' },
          paths: {
            '/products': { 
              get: { 
                operationId: 'searchProducts', 
                tags: ['Catalog'], 
                summary: 'Search products',
                description: 'Search products with filters, pagination and sorting'
              },
              post: { 
                operationId: 'createProduct', 
                tags: ['Catalog'], 
                summary: 'Create product',
                description: 'Create a new product in the catalog'
              }
            },
            '/products/{sku}': { 
              get: { 
                operationId: 'getProductBySku', 
                tags: ['Catalog'], 
                summary: 'Get product by SKU',
                description: 'Get product details by SKU'
              },
              put: { 
                operationId: 'updateProduct', 
                tags: ['Catalog'], 
                summary: 'Update product',
                description: 'Update product details'
              },
              delete: { 
                operationId: 'deleteProduct', 
                tags: ['Catalog'], 
                summary: 'Delete product',
                description: 'Delete product by SKU'
              }
            },
            '/products/{sku}/media': { 
              get: { 
                operationId: 'getProductMedia', 
                tags: ['Catalog'], 
                summary: 'Get product images',
                description: 'Get all media for a product'
              },
              post: { 
                operationId: 'uploadProductMedia', 
                tags: ['Catalog'], 
                summary: 'Upload product image',
                description: 'Upload new media for a product'
              }
            },
            '/categories': { 
              get: { 
                operationId: 'listCategories', 
                tags: ['Catalog'], 
                summary: 'List categories',
                description: 'Get category tree'
              },
              post: { 
                operationId: 'createCategory', 
                tags: ['Catalog'], 
                summary: 'Create category',
                description: 'Create a new category'
              }
            },
            '/categories/{categoryId}': { 
              get: { 
                operationId: 'getCategoryById', 
                tags: ['Catalog'], 
                summary: 'Get category',
                description: 'Get category by ID'
              }
            },
            '/carts/mine': { 
              get: { 
                operationId: 'getMyCart', 
                tags: ['Cart'], 
                summary: 'Get my cart',
                description: 'Get current customer cart'
              },
              post: { 
                operationId: 'createCart', 
                tags: ['Cart'], 
                summary: 'Create cart',
                description: 'Create a new cart for customer'
              }
            },
            '/carts/mine/items': { 
              get: { 
                operationId: 'getCartItems', 
                tags: ['Cart'], 
                summary: 'List cart items',
                description: 'Get all items in cart'
              },
              post: { 
                operationId: 'addToCart', 
                tags: ['Cart'], 
                summary: 'Add to cart',
                description: 'Add item to cart'
              }
            },
            '/carts/mine/items/{itemId}': { 
              put: { 
                operationId: 'updateCartItem', 
                tags: ['Cart'], 
                summary: 'Update cart item',
                description: 'Update item quantity in cart'
              },
              delete: { 
                operationId: 'removeFromCart', 
                tags: ['Cart'], 
                summary: 'Remove from cart',
                description: 'Remove item from cart'
              }
            },
            '/carts/mine/coupons/{couponCode}': { 
              put: { 
                operationId: 'applyCoupon', 
                tags: ['Cart'], 
                summary: 'Apply coupon',
                description: 'Apply discount coupon to cart'
              },
              delete: { 
                operationId: 'removeCoupon', 
                tags: ['Cart'], 
                summary: 'Remove coupon',
                description: 'Remove coupon from cart'
              }
            },
            '/carts/mine/estimate-shipping-methods': { 
              post: { 
                operationId: 'estimateShipping', 
                tags: ['Checkout'], 
                summary: 'Estimate shipping',
                description: 'Estimate shipping methods and costs'
              }
            },
            '/carts/mine/shipping-information': { 
              post: { 
                operationId: 'setShippingInfo', 
                tags: ['Checkout'], 
                summary: 'Set shipping info',
                description: 'Set shipping address and method'
              }
            },
            '/carts/mine/payment-information': { 
              get: { 
                operationId: 'getPaymentMethods', 
                tags: ['Checkout'], 
                summary: 'Get payment methods',
                description: 'Get available payment methods'
              },
              post: { 
                operationId: 'placeOrderWithPayment', 
                tags: ['Checkout'], 
                summary: 'Place order',
                description: 'Set payment info and place order'
              }
            },
            '/orders': { 
              get: { 
                operationId: 'searchOrders', 
                tags: ['Orders'], 
                summary: 'Search orders',
                description: 'Search orders with filters'
              }
            },
            '/orders/{orderId}': { 
              get: { 
                operationId: 'getOrder', 
                tags: ['Orders'], 
                summary: 'Get order',
                description: 'Get order details'
              }
            },
            '/orders/{orderId}/comments': { 
              post: { 
                operationId: 'addOrderComment', 
                tags: ['Orders'], 
                summary: 'Add comment',
                description: 'Add comment to order'
              }
            },
            '/orders/{orderId}/cancel': { 
              post: { 
                operationId: 'cancelOrder', 
                tags: ['Orders'], 
                summary: 'Cancel order',
                description: 'Cancel an order'
              }
            },
            '/customers/me': { 
              get: { 
                operationId: 'getCustomerProfile', 
                tags: ['Customers'], 
                summary: 'Get my profile',
                description: 'Get current customer profile'
              },
              put: { 
                operationId: 'updateCustomerProfile', 
                tags: ['Customers'], 
                summary: 'Update profile',
                description: 'Update customer profile'
              }
            },
            '/customers/me/addresses': { 
              get: { 
                operationId: 'getCustomerAddresses', 
                tags: ['Customers'], 
                summary: 'List addresses',
                description: 'Get customer addresses'
              },
              post: { 
                operationId: 'addCustomerAddress', 
                tags: ['Customers'], 
                summary: 'Add address',
                description: 'Add new customer address'
              }
            },
            '/customers/password': { 
              put: { 
                operationId: 'changePassword', 
                tags: ['Customers'], 
                summary: 'Change password',
                description: 'Change customer password'
              }
            },
            '/integration/customer/token': { 
              post: { 
                operationId: 'customerLogin', 
                tags: ['Auth'], 
                summary: 'Customer login',
                description: 'Generate customer access token'
              }
            },
            '/integration/admin/token': { 
              post: { 
                operationId: 'adminLogin', 
                tags: ['Auth'], 
                summary: 'Admin login',
                description: 'Generate admin access token'
              }
            }
          }
        } 
      }
    });
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-lg">Sources</h3>
      
      {/* Import Mode Tabs */}
      <div className="flex rounded border border-slate-300 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => { setImportMode('url'); setError(null); }}
          className={`flex-1 px-3 py-1.5 text-sm transition-colors ${
            importMode === 'url' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          URL
        </button>
        <button
          onClick={() => { setImportMode('paste'); setError(null); }}
          className={`flex-1 px-3 py-1.5 text-sm transition-colors ${
            importMode === 'paste' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Paste
        </button>
      </div>

      {error && (
        <div className="p-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {importMode === 'url' ? (
        <div className="space-y-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/openapi.yaml"
            className="w-full px-3 py-2 rounded border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm"
          />
          <button
            onClick={handleUrlImport}
            disabled={isLoading || !url}
            className="w-full px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Loading...' : 'Import from URL'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={pastedSpec}
            onChange={(e) => setPastedSpec(e.target.value)}
            placeholder={`Paste OpenAPI YAML or JSON here...\n\nopenapi: 3.0.0\ninfo:\n  title: My API\n  version: 1.0.0\npaths:\n  /items:\n    get:\n      operationId: listItems`}
            className="w-full px-3 py-2 rounded border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm font-mono h-40 resize-none"
          />
          <button
            onClick={handlePasteImport}
            disabled={isLoading || !pastedSpec.trim()}
            className="w-full px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Parsing...' : 'Import Pasted Spec'}
          </button>
        </div>
      )}

      <div className="text-center text-sm text-slate-500">— OR —</div>

      <button
        onClick={handleLoadSample}
        className="w-full px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded hover:from-indigo-500 hover:to-purple-500 text-sm flex items-center justify-center gap-2 shadow-md"
      >
        <span>✨</span>
        <span>Load Complete Sample</span>
      </button>
      <p className="text-xs text-slate-400 text-center">Pet Adoption Workflow with all features</p>

      <div className="text-center text-xs text-slate-400 my-2">— or just APIs —</div>

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center justify-center gap-2"
      >
        <span>🚀</span>
        <span>Load Demo APIs</span>
      </button>
      <p className="text-xs text-slate-400 text-center">Petstore + Magento E-Commerce</p>

      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium text-slate-500">Active Sources</h4>
        {Object.keys(state.sources).map(name => {
          const isUsed = usedSources.has(name);
          const stepsCount = state.spec.workflows.reduce((acc, wf) => 
            acc + wf.steps.filter(s => s.operationId?.startsWith(name + '.')).length, 0
          );
          
          return (
            <Card key={name} isDark={false} className={`p-2 text-sm ${isUsed ? 'border-green-300 dark:border-green-700' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">{name}</span>
                <div className="flex items-center gap-1.5">
                  {isUsed && (
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
                      {stepsCount} step{stepsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-1.5 py-0.5 rounded">OAS</span>
                </div>
              </div>
              {isUsed && (
                <div className="mt-1 text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                  <span>✓</span> Used in workflow
                </div>
              )}
            </Card>
          );
        })}
        {Object.keys(state.sources).length === 0 && (
          <p className="text-xs text-slate-400 italic">No sources loaded</p>
        )}
      </div>
    </div>
  );
}
