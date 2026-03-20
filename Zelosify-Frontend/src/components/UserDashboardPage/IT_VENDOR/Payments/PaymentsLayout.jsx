"use client";
import { useState } from "react";
import { ArrowLeft, Filter, Search } from "lucide-react";
import { Button } from "@/components/UI/shadcn/button";
import OrderDetailsPopup from "./OrderDetailsPopup";
import SelectionToolbar from "./SelectionToolbar";
import Statistics from "./Statistics";

const contracts = [
  {
    id: "#192541",
    customer: { initials: "EH", name: "Esther Howard" },
    type: "Shipping",
    status: "Active",
    total: "$3,127.00",
    date: "Jun 19",
    people: "xxx@gmail.com",
  },
  {
    id: "#192540",
    customer: { initials: "DM", name: "David Miller" },
    type: "Pickups",
    status: "Active",
    total: "$864.00",
    date: "Jun 19",
    people: "yyy@gmail.com",
  },
  {
    id: "#192539",
    customer: { initials: "JM", name: "James Moore" },
    type: "Shipping",
    status: "Active",
    total: "$1,527.00",
    date: "Jun 19",
    people: "zzz@gmail.com",
  },
  {
    id: "#192341",
    customer: { initials: "EH", name: "Esther Howard" },
    type: "Shipping",
    status: "Active",
    total: "$3,127.00",
    date: "Jun 19",
    people: "xxx@gmail.com",
  },
  {
    id: "#092540",
    customer: { initials: "DM", name: "David Miller" },
    type: "Pickups",
    status: "Active",
    total: "$864.00",
    date: "Jun 19",
    people: "yyy@gmail.com",
  },
  {
    id: "#192531",
    customer: { initials: "JM", name: "James Moore" },
    type: "Shipping",
    status: "Active",
    total: "$1,527.00",
    date: "Jun 19",
    people: "zzz@gmail.com",
  },
  {
    id: "#192571",
    customer: { initials: "EH", name: "Esther Howard" },
    type: "Shipping",
    status: "Active",
    total: "$3,127.00",
    date: "Jun 19",
    people: "xxx@gmail.com",
  },
  {
    id: "#192240",
    customer: { initials: "DM", name: "David Miller" },
    type: "Pickups",
    status: "Active",
    total: "$864.00",
    date: "Jun 19",
    people: "yyy@gmail.com",
  },
  {
    id: "#198539",
    customer: { initials: "JM", name: "James Moore" },
    type: "Shipping",
    status: "Active",
    total: "$1,527.00",
    date: "Jun 19",
    people: "zzz@gmail.com",
  },
  {
    id: "#192541",
    customer: { initials: "EH", name: "Esther Howard" },
    type: "Shipping",
    status: "Active",
    total: "$3,127.00",
    date: "Jun 19",
    people: "xxx@gmail.com",
  },
];

export default function PaymentsLayout() {
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const handleOrderClick = (order) => {
    setActiveOrder(order);
    setShowOrderDetails(true);
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = (e) => {
    setSelectedOrders(
      e.target.checked ? contracts.map((contract) => contract.id) : []
    );
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Payments</h1>
            {!isSidebarVisible && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSidebarVisible(true)}
                className="rounded-md border-border bg-background hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter and Search */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <button className="px-6 py-3 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-muted-foreground transition-colors flex items-center gap-2">
              Filter
              <Filter className="w-3.5 h-3.5" />
            </button>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-3 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border border-border"
                      checked={selectedOrders.length === contracts.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Contract No.
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Vendor name
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Approver
                  </th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract, index) => (
                  <tr
                    key={index}
                    className="border-b border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer group"
                    onClick={() => handleOrderClick(contract)}
                  >
                    <td
                      className="px-4 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="rounded border border-border"
                        checked={selectedOrders.includes(contract.id)}
                        onChange={() => handleSelectOrder(contract.id)}
                      />
                    </td>
                    <td className="px-4 py-4 text-xs text-foreground">
                      {contract.id}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-foreground">
                          {contract.customer.initials}
                        </div>
                        <span className="text-xs text-foreground">
                          {contract.customer.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-foreground">
                      {contract.type}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/20 rounded-full">
                        {contract.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-foreground">
                      {contract.total}
                    </td>
                    <td className="px-4 py-4 text-xs text-foreground">
                      {contract.date}
                    </td>
                    <td className="px-4 py-4 text-xs text-foreground">
                      {contract.people}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Statistics */}
      {isSidebarVisible && (
        <Statistics setIsSidebarVisible={setIsSidebarVisible} />
      )}

      {/* Popups and Toolbars */}
      {showOrderDetails && (
        <OrderDetailsPopup
          order={activeOrder}
          onClose={() => setShowOrderDetails(false)}
        />
      )}

      {selectedOrders.length > 0 && (
        <SelectionToolbar selectedCount={selectedOrders.length} />
      )}
    </div>
  );
}
