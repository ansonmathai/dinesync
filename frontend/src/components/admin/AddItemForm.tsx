'use client'
import { inventoryService } from "@/services/api"
import { useEffect, useState } from "react"

export default function AddItemForm({ editData, onClear, onRefresh }: {
    editData: any,
    onClear: () => void,
    onRefresh: () => void 
}) {
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')

    useEffect(() => {
        if (editData) {
            setName(editData.name)
            setPrice(editData.price.toString())
        } else {
            setName('')
            setPrice('')
        }
    }, [editData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || ! price) return

        try {
            if (editData) {
                await inventoryService.updateItem(editData.name, {
                    name,
                    price: parseInt(price)
                })
                onClear()
            } else {
                await inventoryService.addItem(name, parseInt(price))
            }

            onRefresh()
            setName('')
            setPrice('')
        } catch (err) {
            alert("Check if FastAPI is running!")
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <input 
                className="flex-1 bg-slate-50 p-2 rounded-lg outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="Item Name"
                value={name}
                id="item-name"
                name="item-name"
                autoComplete="organization-title"
                required
                onChange={(e) => setName(e.target.value)}
            />
            <input
                className="w-24 bg-slate-50 p-2 rounded-lg outline-none"
                placeholder="Price"
                type="number"
                value={price}
                id="item-price"
                name="item-price"
                autoComplete="off"
                required
                onChange={(e) => setPrice(e.target.value)} 
             />
             <button
                type="submit"
                className={`${editData ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white px-6 py-2 rounded-lg fond-bold hover:bg-emerald-600 transition-colors`}
             >
                {editData ? 'UPDATE' : 'ADD'}
             </button>
             {editData && (
                <button
                    type="button"
                    onClick={onClear}
                    className="bg-slate-100 text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
                >
                    Cancel
                </button>
             )}
        </form>
    )
}