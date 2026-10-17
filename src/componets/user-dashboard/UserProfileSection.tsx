import DashboardOverview from './DashboardOverview';
import InventorySection, {
  type DashboardInventoryItem,
} from './InventorySection';
import OrdersSection, {
  type DashboardOrder,
} from './OrdersSection';
import ReturnRequestsSection from './ReturnRequestsSection';
import type { ReturnRequest } from '../../types';

const UserProfileSection = () => {
  const profile = {
    fullName: 'نام کاربر',
    territory: 'محدوده نمایندگی',
    creditAmount: 50000000,
  };

  const inventoryItems: DashboardInventoryItem[] = [
    {
      id: '1',
      title: 'نام کالا',
      quantity: 10,
      unitPrice: 1500000,
      totalPrice: 15000000,
    },
  ];

  const orders: DashboardOrder[] = [
    {
      id: '1',
      title: 'نمونه سفارش',
      quantity: 2,
      amount: 3000000,
      createdAt: new Date().toISOString(),
    },
  ];

  const returnRequests: ReturnRequest[] = [];

  const inventoryItemCount = inventoryItems.reduce(
    (sum, item) => {
      return sum + Number(item.quantity || 0);
    },
    0,
  );

  const inventoryValue = inventoryItems.reduce(
    (sum, item) => {
      return (
        sum +
        Number(
          item.totalPrice ??
            Number(item.quantity || 0) *
              Number(item.unitPrice || 0),
        )
      );
    },
    0,
  );

  return (
    <main dir="rtl" className="space-y-6">
      <DashboardOverview
        fullName={profile.fullName}
        territory={profile.territory}
        creditAmount={profile.creditAmount}
        inventoryItemCount={inventoryItemCount}
        inventoryValue={inventoryValue}
      />

      <OrdersSection orders={orders} />

      <InventorySection items={inventoryItems} />

      <ReturnRequestsSection
        requests={returnRequests}
        loading={false}
        errorMessage=""
        onRefresh={() => {}}
        onRequestCreated={() => {}}
      />
    </main>
  );
};

export default UserProfileSection;