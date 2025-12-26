'use client';

import { useState } from 'react';
import UnifiedDocumentationView from './UnifiedDocumentationView';
import type { ArazzoSpec } from '@/types/arazzo';

// Sample spec avec plusieurs workflows
const sampleSpec: ArazzoSpec = {
  arazzo: '1.0.1',
  info: {
    title: 'Pet Store Workflows Demo',
    version: '1.0.0',
    summary: 'Complete workflows for pet adoption and management',
    description: 'This Arazzo specification demonstrates multiple workflows for interacting with the Pet Store API, including pet adoption, search, and order management.',
  },
  sourceDescriptions: [
    {
      name: 'petstore',
      type: 'openapi',
      url: './openapi/petstore.yaml',
      description: 'The Pet Store API for managing pets and orders',
    },
    {
      name: 'inventory',
      type: 'openapi',
      url: './openapi/inventory.yaml',
      description: 'Inventory management API',
    },
  ],
  workflows: [
    {
      workflowId: 'pet-adoption',
      summary: 'Complete Pet Adoption Flow',
      description: 'This workflow guides through the complete process of adopting a pet, from searching for available pets to placing an order.',
      inputs: {
        type: 'object',
        properties: {
          petType: { type: 'string', description: 'Type of pet to search for' },
          maxPrice: { type: 'number', description: 'Maximum price for the pet' },
          customerId: { type: 'string', description: 'Customer ID for the order' },
        },
        required: ['petType', 'customerId'],
      },
      steps: [
        {
          stepId: 'find-available-pets',
          operationId: 'petstore.findPetsByStatus',
          description: 'Search for pets that are available for adoption',
          parameters: [
            { name: 'status', in: 'query', value: 'available' },
            { name: 'limit', in: 'query', value: '10' },
          ],
          successCriteria: [
            { condition: '$statusCode == 200' },
            { condition: '$response.body.length > 0' },
          ],
          outputs: {
            availablePets: '$response.body',
            petCount: '$response.body.length',
          },
        },
        {
          stepId: 'select-pet',
          operationId: 'petstore.getPetById',
          description: 'Get details of the selected pet',
          parameters: [
            { name: 'petId', in: 'path', value: '$inputs.selectedPetId' },
          ],
          outputs: {
            selectedPet: '$response.body',
          },
        },
        {
          stepId: 'place-order',
          operationId: 'petstore.placeOrder',
          description: 'Place an order for the selected pet',
          requestBody: {
            contentType: 'application/json',
            payload: {
              petId: '$steps.select-pet.outputs.selectedPet.id',
              quantity: 1,
              status: 'placed',
            },
          },
          outputs: {
            order: '$response.body',
          },
        },
      ],
      outputs: {
        adoptedPet: '$steps.select-pet.outputs.selectedPet',
        orderConfirmation: '$steps.place-order.outputs.order',
      },
    },
    {
      workflowId: 'pet-search',
      summary: 'Search Available Pets',
      description: 'Simple workflow to search for available pets by status and category.',
      inputs: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['available', 'pending', 'sold'], default: 'available' },
          category: { type: 'string', description: 'Pet category' },
        },
      },
      steps: [
        {
          stepId: 'search',
          operationId: 'petstore.findPetsByStatus',
          description: 'Find pets by status',
          parameters: [
            { name: 'status', in: 'query', value: '$inputs.status' },
          ],
          outputs: {
            results: '$response.body',
          },
        },
      ],
      outputs: {
        pets: '$steps.search.outputs.results',
      },
    },
    {
      workflowId: 'inventory-check',
      summary: 'Check Inventory Status',
      description: 'Check the current inventory status across all categories.',
      steps: [
        {
          stepId: 'get-inventory',
          operationId: 'inventory.getInventory',
          description: 'Retrieve current inventory levels',
          outputs: {
            inventory: '$response.body',
          },
        },
      ],
      outputs: {
        inventoryStatus: '$steps.get-inventory.outputs.inventory',
      },
    },
  ],
};

interface UnifiedDocumentationViewShowcaseProps {
  isDark: boolean;
}

export default function UnifiedDocumentationViewShowcase({ isDark }: UnifiedDocumentationViewShowcaseProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">UnifiedDocumentationView</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Unified view combining Overview + Intro with TOC sidebar. 
          Accessible in Documentation mode to see all workflows sequentially.
        </p>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</h3>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            3 workflows • TOC with search • Collapsible steps
          </p>
        </div>
        
        <div className={`h-[600px] ${isDark ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}>
          <UnifiedDocumentationView 
            spec={sampleSpec} 
            isDark={isDark}
            onViewFlowchart={(workflowId) => {
              alert(`Open flowchart view for: ${workflowId}`);
            }}
            onViewSequence={(workflowId) => {
              alert(`Open sequence view for: ${workflowId}`);
            }}
          />
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            TOC Search
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Search bar to filter workflows and steps instantly
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Collapsible Workflows
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Steps shown/hidden per workflow, collapsed by default
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Direct Navigation
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Click on a step in TOC → direct scroll to StepCard
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open View Buttons
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Buttons to open flowchart/sequence in fullscreen from Documentation
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Rich Content
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Spec Header, Sources, Inputs/Outputs, StepCards for each workflow
          </p>
        </div>
      </div>

      {/* Usage */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className={`font-semibold mb-1 ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
              Replaces Overview + Intro
            </h4>
            <p className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
              This component merges the old Overview and Intro views. 
              Used in &quot;Documentation&quot; mode in the Builder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
