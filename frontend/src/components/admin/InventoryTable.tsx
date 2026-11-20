'use client'

import { inventoryService } from "@/services/api"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Item {
    name: string
    price: number
    current_count: number
    unit_type: string
}

interface TableProps {
    items: Item[]
    loading: boolean
    onRefresh: () => void
    onEdit: (item: Item) => void
    onUpdateStock: (name: string, change: number) => void
}

export default function InventoryTable({ items, loading, onRefresh, onEdit, onUpdateStock }: TableProps) {

    const [bulkValue, setBulkValue] = useState<{ [key: string]: string}>({})

    const handleDelete = async (name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            try {
                await inventoryService.deleteItem(name)
                onRefresh()
            } catch (err) {
                alert("Could not delete item.")
            }
        }
    }

    const handleBulkSubmit = (itemName: string, type: 'ADD' | 'SALE') => {
        const amount = parseInt(bulkValue[itemName])
        if (!isNaN(amount) && amount > 0) {

            const finalAmount = type === 'SALE' ? -amount : amount
            try {
                onUpdateStock(itemName, finalAmount)
                setBulkValue(prev => ({ ...prev, [itemName]: ''}))
            } catch (err) {
                console.error("Failed to update stock")
            }
        }
    }

    if (loading) {
        return (
            <div>
                <Loader2 className="animate-spin mb-2" size={32} />
                <p>Loading your kitchen data...</p>
            </div>
        )
    }

    if (items.length == 0) {
        return (
            <div className="p-20 text-center text-slate-400">
                <p className="font-medium">No items found in the menu</p>
                <p className="text-xs mt-1">Start by adding a new dish above!</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400">Item Name</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400 text-center">Price</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400 text-center">Stock</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {items.map((item) => (
                        <tr key={item.name} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 font-semibold text-slate-700">{item.name}</td>
                            <td className="px-6 py-4 text-center">
                                <span className="bg-emerald-50 text-emerald-700 px2 py1 rounded text-sm font-bold">
                                    ₹{item.price}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center text-slate-600 font-medium">
                                <div className="flex items-center gap-2 bg-slate-50 w-fit rounded-lg p-1 border border-slate-200">
                                    <button
                                        onClick={() => onUpdateStock(item.name, -1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-slate-500 hover:text-red-600 transition-all"
                                    >
                                        -
                                    </button>

                                    <span className="w-8 text-center font-mono font-bold text-slate-700">
                                        {item.current_count}
                                    </span>

                                    <button
                                        onClick={() => onUpdateStock(item.name, 1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-slate-500 hover:text-emerald-600 transition-all"
                                    >
                                        +
                                    </button>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <button 
                                    onClick={() => handleBulkSubmit(item.name, 'ADD')}
                                    className="text-emerald-500 hover:text-emerald-600 hover:scale-110 transition-transform"
                                    title="Restock/Add Stock"
                                    >
                                    <ArrowUpCircle size={24} />
                                    </button>

                                    <input 
                                    type="number"
                                    placeholder="Qty"
                                    onFocus={e => e.target.select()}
                                    className="w-16 p-2 text-center bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-slate-400"
                                    value={bulkValue[item.name] || ''}
                                    onChange={(e) => setBulkValue({ ...bulkValue, [item.name]: e.target.value })}
                                    />

                                    <button 
                                    onClick={() => handleBulkSubmit(item.name, 'SALE')}
                                    className="text-red-500 hover:text-red-600 hover:scale-110 transition-transform"
                                    title="Bulk Sale/Remove"
                                    >
                                    <ArrowDownCircle size={24} />
                                    </button>
                                </div>
                                </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(item)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.name)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}

                </tbody>
            </table>
        </div>
    )
}