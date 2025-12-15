// Import Firebase modules
/* * We are removing all Firebase imports and logic to run the app in a local-only mode.
 * This "fixes" the connection error by making the app work offline.
 */
// import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// import { 
//      getAuth, 
//      signInAnonymously, 
//      signInWithCustomToken,
//      onAuthStateChanged 
// } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// import { 
//      getFirestore, 
//      collection, 
//      doc, 
//      onSnapshot, 
//      writeBatch,
//      updateDoc,
//      setLogLevel
// } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
const appId = 'default-app-id'; // Set a default

// All Firebase initialization is removed.
const app = null;
const auth = null;
const db = null;

// --- Initial Fleet Data ---
const INITIAL_FLEET = [
    { id: '1', type: 'car', make: 'Toyota', model: 'Camry', year: 2021, price: 55.00, isRented: false, doors: 4, imageUrl: 'https://image.pollinations.ai/prompt/2021%20Toyota%20Camry,%20silver,%20urban%20setting,%20photorealistic?width=400&height=225&seed=1' },
    { id: '2', type: 'car', make: 'Honda', model: 'Civic', year: 2020, price: 45.00, isRented: false, doors: 2, imageUrl: 'https://image.pollinations.ai/prompt/2020%20Honda%20Civic,%20red,%20dynamic%20shot,%20photorealistic?width=400&height=225&seed=2' },
    { id: '3', type: 'bike', make: 'Harley-Davidson', model: 'Street Bob', year: 2019, price: 35.00, isRented: false, hasSidecar: false, imageUrl: 'https://image.pollinations.ai/prompt/2019%20Harley-Davidson%20Street%20Bob,%20dark%20grey,%20on%20a%20highway,%20photorealistic?width=400&height=225&seed=3' },
    { id: '4', type: 'bike', make: 'Yamaha', model: 'MT-07', year: 2022, price: 30.00, isRented: true, hasSidecar: false, imageUrl: 'https://image.pollinations.ai/prompt/2022%20Yamaha%20MT-07,%20blue,%20sporty%20stance,%20photorealistic?width=400&height=225&seed=4' },
    { id: '5', type: 'car', make: 'Ford', model: 'Mustang', year: 2023, price: 70.00, isRented: false, doors: 2, imageUrl: 'https://image.pollinations.ai/prompt/2023%20Ford%20Mustang,%20yellow,%20muscle%20car,%20action%20shot,%20photorealistic?width=400&height=225&seed=5' },
    { id: '6', type: 'bike', make: 'KTM', model: 'Duke 390', year: 2023, price: 28.00, isRented: false, hasSidecar: false, imageUrl: 'https://image.pollinations.ai/prompt/2023%20KTM%20Duke%20390,%20orange,%20on%20a%20mountain%20road,%20photorealistic?width=400&height=225&seed=6' },
];

// --- Application State ---
let state = {
    user: null,
    vehicles: INITIAL_FLEET, // Load initial data immediately
    loading: false,         // Start with loading false
    filter: 'all', // 'all', 'car', 'bike'
    selectedVehicle: null, // For rental modal
    rentalDays: 1,
    notification: null, // { type, message, details }
    notificationTimeout: null,
    billDetails: null // { vehicle, days, totalUSD, totalINR, invoiceId, rentalDate }
};

// --- DOM Element References ---
const dom = {
    loader: document.getElementById('loader'),
    filterTabs: document.getElementById('filter-tabs'),
    vehicleGrid: document.getElementById('vehicle-grid'),
    noVehiclesMessage: document.getElementById('no-vehicles-message'),
    vehicleCardTemplate: document.getElementById('vehicle-card-template'),
    svgTemplates: document.getElementById('svg-templates'),

    // Modal
    modal: document.getElementById('rental-modal'),
    modalTitle: document.getElementById('modal-title'),
    daysDecrement: document.getElementById('days-decrement'),
    daysIncrement: document.getElementById('days-increment'),
    rentalDaysDisplay: document.getElementById('rental-days-display'),
    modalRate: document.getElementById('modal-rate'),
    modalTotalUsd: document.getElementById('modal-total-usd'),
    modalTotalInr: document.getElementById('modal-total-inr'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    modalConfirmBtn: document.getElementById('modal-confirm-btn'),

    // Bill Modal
    billModal: document.getElementById('bill-modal'),
    billContent: document.getElementById('bill-content'),
    billInvoiceId: document.getElementById('bill-invoice-id'),
    billDate: document.getElementById('bill-date'),
    billVehicleImage: document.getElementById('bill-vehicle-image'),
    billVehicleName: document.getElementById('bill-vehicle-name'),
    billVehicleYear: document.getElementById('bill-vehicle-year'),
    billLineItemDesc: document.getElementById('bill-line-item-desc'),
    billLineItemRate: document.getElementById('bill-line-item-rate'),
    billLineItemTotal: document.getElementById('bill-line-item-total'),
    billTotalUsd: document.getElementById('bill-total-usd'),
    billTotalInr: document.getElementById('bill-total-inr'),
    billPrintBtn: document.getElementById('bill-print-btn'),
    billCloseBtn: document.getElementById('bill-close-btn'),

    // Notification
    toast: document.getElementById('notification-toast'),
    toastMessage: document.getElementById('notification-message'),
    toastDetails: document.getElementById('notification-details'),
    toastCloseBtn: document.getElementById('notification-close-btn')
};

// --- Helper to get SVG from template ---
const getSvg = (id) => dom.svgTemplates.content.getElementById(id).cloneNode(true);

// --- Render Functions ---

/**
 * Main render function to update the UI based on state
 */
function render() {
    // Render Loader
    dom.loader.classList.toggle('hidden', !state.loading);

    // Render Filter Tabs
    dom.filterTabs.querySelectorAll('.filter-btn').forEach(btn => {
        const filter = btn.dataset.filter;
        const isActive = state.filter === filter;
        btn.classList.toggle('bg-slate-900', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('shadow-md', isActive);
        btn.classList.toggle('text-slate-500', !isActive);
        btn.classList.toggle('hover:bg-slate-50', !isActive);
        btn.classList.toggle('hover:text-slate-700', !isActive);
    });

    // Render Vehicles
    renderVehicleGrid();

    // Render Modal
    renderModal();

    // Render Bill Modal
    renderBillModal();

    // Render Notification
    renderNotification();
}

/**
 * Renders the grid of vehicle cards
 */
function renderVehicleGrid() {
    dom.vehicleGrid.innerHTML = ''; // Clear existing grid

    const filteredVehicles = state.vehicles.filter(v => {
        if (state.filter === 'all') return true;
        return v.type === state.filter;
    });

    if (filteredVehicles.length === 0 && !state.loading) {
        dom.noVehiclesMessage.classList.remove('hidden');
    } else {
        dom.noVehiclesMessage.classList.add('hidden');
    }

    filteredVehicles.forEach(vehicle => {
        const card = dom.vehicleCardTemplate.content.cloneNode(true);
        const cardRoot = card.querySelector('.group');

        // Find elements within the card
        const ui = {
            image: card.querySelector('[data-id="image"]'),
            statusBadge: card.querySelector('[data-id="status-badge"]'),
            typeIconContainer: card.querySelector('[data-id="type-icon-container"]'),
            makeModel: card.querySelector('[data-id="make-model"]'),
            yearType: card.querySelector('[data-id="year-type"]'),
            price: card.querySelector('[data-id="price"]'),
            specificFeature: card.querySelector('[data-id="specific-feature"]'),
            actionButtonContainer: card.querySelector('[data-id="action-button-container"]'),
        };

        // --- Populate Card ---
        cardRoot.classList.toggle('border-orange-200', vehicle.isRented);
        cardRoot.classList.toggle('bg-orange-50/30', vehicle.isRented);
        cardRoot.classList.toggle('border-slate-200', !vehicle.isRented);
        cardRoot.classList.toggle('hover:-translate-y-1', !vehicle.isRented);

        // Image
        ui.image.src = vehicle.imageUrl;
        ui.image.alt = `${vehicle.make} ${vehicle.model}`;
        ui.image.onerror = () => {
            ui.image.src = `https://placehold.co/400x225/e2e8f0/94a3b8?text=Image+Not+Found`;
        };

        // Status Badge
        ui.statusBadge.innerHTML = '';
        ui.statusBadge.appendChild(getSvg(vehicle.isRented ? 'badge-rented' : 'badge-available'));

        // Type Icon
        ui.typeIconContainer.innerHTML = '';
        if (vehicle.type === 'car') {
            ui.typeIconContainer.classList.add('bg-blue-50', 'text-blue-600');
            ui.typeIconContainer.appendChild(getSvg('icon-car'));
        } else {
            ui.typeIconContainer.classList.add('bg-purple-50', 'text-purple-600');
            ui.typeIconContainer.appendChild(getSvg('icon-bike'));
        }

        // Text Content
        ui.makeModel.textContent = `${vehicle.make} ${vehicle.model}`;
        ui.yearType.textContent = `${vehicle.year} • ${vehicle.type === 'car' ? 'Automatic' : 'Manual'}`;
        ui.price.textContent = `$${vehicle.price.toFixed(2)}/day`;

        // Specific Feature
        ui.specificFeature.innerHTML = '';
        let featureClone;
        if (vehicle.type === 'car') {
            featureClone = getSvg('feature-car');
            featureClone.querySelector('[data-id="feature-text"]').textContent = `${vehicle.doors} Doors`;
        } else {
            featureClone = getSvg('feature-bike');
            featureClone.querySelector('[data-id="feature-text"]').textContent = vehicle.hasSidecar ? 'Sidecar' : 'Solo';
        }
        ui.specificFeature.appendChild(featureClone);

        // Action Button
        ui.actionButtonContainer.innerHTML = '';
        let buttonClone;
        if (vehicle.isRented) {
            buttonClone = getSvg('button-return');
            buttonClone.addEventListener('click', () => handleReturn(vehicle));
        } else {
            buttonClone = getSvg('button-rent');
            buttonClone.addEventListener('click', () => openRentalModal(vehicle));
        }
        ui.actionButtonContainer.appendChild(buttonClone);

        // Append card to grid
        dom.vehicleGrid.appendChild(card);
    });
}

/**
 * Renders the rental modal
 */
function renderModal() {
    if (state.selectedVehicle) {
        const vehicle = state.selectedVehicle;
        const totalUSD = vehicle.price * state.rentalDays;
        const totalINR = totalUSD * 82;

        dom.modalTitle.textContent = `Rent ${vehicle.make} ${vehicle.model}`;
        dom.rentalDaysDisplay.textContent = state.rentalDays;
        dom.modalRate.textContent = `$${vehicle.price.toFixed(2)}`;
        dom.modalTotalUsd.textContent = `$${totalUSD.toFixed(2)}`;
        dom.modalTotalInr.textContent = `₹${totalINR.toFixed(2)}`;

        dom.modal.classList.remove('hidden');
        dom.modal.classList.add('flex');
    } else {
        dom.modal.classList.add('hidden');
        dom.modal.classList.remove('flex');
    }
}

/**
 * Renders the bill modal
 */
function renderBillModal() {
    if (state.billDetails) {
        const { vehicle, days, totalUSD, totalINR, invoiceId, rentalDate } = state.billDetails;

        dom.billInvoiceId.textContent = invoiceId;
        dom.billDate.textContent = rentalDate;
        dom.billVehicleImage.src = vehicle.imageUrl;
        dom.billVehicleImage.onerror = () => {
            dom.billVehicleImage.src = `https://placehold.co/100x75/e2e8f0/94a3b8?text=Image`;
        };
        dom.billVehicleName.textContent = `${vehicle.make} ${vehicle.model}`;
        dom.billVehicleYear.textContent = vehicle.year;

        dom.billLineItemDesc.textContent = `Rental for ${days} day${days > 1 ? 's' : ''}`;
        dom.billLineItemRate.textContent = `$${vehicle.price.toFixed(2)}/day`;
        dom.billLineItemTotal.textContent = `$${totalUSD.toFixed(2)}`;

        dom.billTotalUsd.textContent = `$${totalUSD.toFixed(2)}`;
        dom.billTotalInr.textContent = `₹${totalINR.toFixed(2)}`;

        dom.billModal.classList.remove('hidden');
        dom.billModal.classList.add('flex');
    } else {
        dom.billModal.classList.add('hidden');
        dom.billModal.classList.remove('flex');
    }
}

/**
 * Renders the notification toast
 */
function renderNotification() {
    if (state.notificationTimeout) {
        clearTimeout(state.notificationTimeout);
        state.notificationTimeout = null;
    }

    if (state.notification) {
        const { type, message, details } = state.notification;
        const styles = {
            success: "bg-green-100 border-green-500 text-green-800",
            info: "bg-blue-100 border-blue-500 text-blue-800",
            error: "bg-red-100 border-red-500 text-red-800"
        };

        dom.toast.className = `fixed bottom-4 right-4 max-w-md p-4 rounded-lg shadow-lg border-l-4 z-50 flex items-start gap-3 animate-slide-up ${styles[type]}`;
        dom.toastMessage.textContent = message;

        if (details) {
            dom.toastDetails.textContent = details;
            dom.toastDetails.classList.remove('hidden');
        } else {
            dom.toastDetails.classList.add('hidden');
        }

        dom.toast.classList.remove('hidden');

        state.notificationTimeout = setTimeout(hideNotification, 5000);
    } else {
        dom.toast.classList.add('hidden');
    }
}

// --- State Updaters & Actions ---

function setState(newState) {
    state = { ...state, ...newState };
    render();
}

function openRentalModal(vehicle) {
    setState({ selectedVehicle: vehicle, rentalDays: 1 });
}

function closeRentalModal() {
    setState({ selectedVehicle: null });
}

function hideNotification() {
    setState({ notification: null });
}

function closeBillModal() {
    setState({ billDetails: null });
}

function adjustRentalDays(amount) {
    const newDays = Math.max(1, state.rentalDays + amount);
    setState({ rentalDays: newDays });
}

/**
 * Rent a vehicle
 */
async function handleRent() {
    // REMOVED GUARD: No longer checking for user or db.

    const vehicleToRent = state.selectedVehicle;
    if (!vehicleToRent || state.rentalDays <= 0) return;

    // --- OFFLINE LOGIC ---
    // Instead of calling database, we update the local state directly.
    const newVehicles = state.vehicles.map(v => {
        if (v.id === vehicleToRent.id) {
            return { ...v, isRented: true }; // Create a new object with isRented: true
        }
        return v; // Return other vehicles unchanged
    });
    // --- END OFFLINE LOGIC ---

    try {
        // We simulate a successful rental

        const totalUSD = vehicleToRent.price * state.rentalDays;
        const totalINR = totalUSD * 82;

        // --- New Bill Generation Logic ---
        const invoiceId = `RNT-${Math.floor(Math.random() * 90000) + 10000}`;
        const rentalDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        setState({
            vehicles: newVehicles, // Set the new vehicles list
            selectedVehicle: null, // Close rental modal
            rentalDays: 1,
            // Instead of a notification, we set billDetails
            billDetails: {
                vehicle: vehicleToRent,
                days: state.rentalDays,
                totalUSD,
                totalINR,
                invoiceId,
                rentalDate
            }
        });
    } catch (error) {
        // This catch block will likely not be hit, but it's good practice.
        console.error("Error processing local rental:", error);
        setState({
            notification: { type: 'error', message: "Failed to process rental." }
        });
    }
}

/**
 * Return a vehicle
 */
async function handleReturn(vehicle) {
    // REMOVED GUARD: No longer checking for user or db.

    // --- OFFLINE LOGIC ---
    // Update the local state directly
    const newVehicles = state.vehicles.map(v => {
        if (v.id === vehicle.id) {
            return { ...v, isRented: false }; // Create a new object with isRented: false
        }
        return v;
    });
    // --- END OFFLINE LOGIC ---

    try {
        // Simulate a successful return
        // await updateDoc(vehicleRef, { isRented: false });
        setState({
            vehicles: newVehicles, // Set the new vehicles list
            notification: {
                type: 'info',
                message: `Returned ${vehicle.make} ${vehicle.model}`,
                details: "Vehicle is now available for others."
            }
        });
    } catch (error) {
        console.error("Error processing local return:", error);
        setState({
            notification: { type: 'error', message: "Failed to return vehicle." }
        });
    }
}

// --- Firebase Initialization ---
/*
 * All Firebase-related functions are removed as we are running in local-only mode.
 */

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Filter Tabs
    dom.filterTabs.addEventListener('click', (e) => {
        const button = e.target.closest('.filter-btn');
        if (button && button.dataset.filter) {
            setState({ filter: button.dataset.filter });
        }
    });

    // Modal Buttons
    dom.daysDecrement.addEventListener('click', () => adjustRentalDays(-1));
    dom.daysIncrement.addEventListener('click', () => adjustRentalDays(1));
    dom.modalCancelBtn.addEventListener('click', closeRentalModal);
    dom.modalConfirmBtn.addEventListener('click', handleRent);

    // Bill Modal Buttons
    dom.billPrintBtn.addEventListener('click', () => window.print());
    dom.billCloseBtn.addEventListener('click', closeBillModal);

    // Notification Close
    dom.toastCloseBtn.addEventListener('click', hideNotification);
}

// --- App Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    // initAuth(); // No longer needed
    render(); // Initial render (shows data immediately from INITIAL_FLEET)
});
