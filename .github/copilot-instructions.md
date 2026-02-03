# Copilot Instructions for OAS-CRM

## Architecture Overview

**OAS-CRM** is a full-stack CRM application with a clear **Backend/Server separation**:

- **Backend/** (React + Vite): Frontend dashboard with Material-UI components and Tailwind CSS
- **Server/** (Node.js + Express): REST API backend with MongoDB persistence

### Data Flow Pattern
1. React components (e.g., `Clients.jsx`) fetch data via `axios` with Bearer token authentication
2. API endpoints at `Server/API/{resource}/` follow MVC pattern: `*_Controller.js`, `*_Model.js`, `*_Route.js`
3. All requests include JWT token from localStorage; verify in `Server/Middlewares/Check_Login.js`

## Development Workflows

### Frontend (Backend/)
```bash
cd Backend
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Production build
npm run lint     # Run ESLint
```

### Backend (Server/)
```bash
cd Server
npm start        # Start Express with nodemon (watches file changes, runs on :9000)
```

### Key Environment Variables
- **Frontend**: `VITE_SERVER_URL` (Backend endpoint, e.g., `http://localhost:9000/api`)
- **Backend**: `MONGO_URI`, `PORT=9000`, `NODE_ENV`

## Code Patterns & Conventions

### Frontend Components

#### Page Pattern (CRUD)
All resource pages (e.g., `Pages/Client/Clients.jsx`, `Pages/Lead/Leads.jsx`) follow this structure:
- **Datatable component**: Displays data with Material-React-Table, includes Edit/Delete/View actions
- **Modal dialogs**: `Add_Edit.jsx` for form operations, `View.jsx` for read-only details
- **Permission-based actions**: `userType` from localStorage controls visible features:
  ```jsx
  const userPermissions = userType === "Admin" ? { canEdit, canView, canDelete } : { canEdit, canView, canDelete: false };
  ```

#### Data Fetching Pattern
- Always use `axios` with error handling via `react-toastify` notifications
- Endpoint variable: `const EndPoint = 'clients'` maps to `${import.meta.env.VITE_SERVER_URL}/api/clients`
- Refresh data after mutations: `fetchData()` re-fetches list after add/edit/delete
- Example (Client/Clients.jsx):
  ```jsx
  const fetchData = async () => {
      try {
          const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/${EndPoint}`);
          setData(response.data.reverse()); // Show newest first
      } catch (error) { toast.error(...); }
  };
  ```

#### Form Components
- Use **Material-UI** (`TextField`, `Autocomplete`, `Modal`, `Button`)
- **RichTextEditor** for long text fields (e.g., `project_details`)
- Modal style constant: shared `modalStyle` object for consistency
- Form validation state: `setErrors({})` for inline error display

#### Datatable Configuration
- Columns passed as props with specific structure (see `Datatable/Datatable.jsx`)
- Auto-generated actions: Edit, Delete (if permitted), View, CSV export
- Exclude fields in CSV: `['_id', 'secret_code', 'password', '__v', 'images']`

### Backend API

#### Controller Pattern (MVC)
File: `API/{Resource}/{Resource}_Controller.js`
- Functions: `{Resource}s()` (list), `Create()`, `Update()`, `Delete()`, `BulkImport()`
- Validation before DB operations: check required fields, uniqueness
- Errors: Send status 400 for validation, 500 for server errors
- Success: Return created/updated object with 200 status
- Example (Client_Controller.js):
  ```javascript
  let Create = async (req, res) => {
      const { agent, name, phone } = req.body;
      if (!agent || !name || !phone) return res.status(400).send('Field required!');
      if (await Client.findOne({ phone })) return res.status(400).send('Phone exists!');
      const newData = new Client({ agent, name, phone, ... });
      await newData.save();
      res.status(200).json(newData);
  };
  ```

#### Mongoose Model Pattern
File: `API/{Resource}/{Resource}_Model.js`
- Simple schema with `{ timestamps: true }` for createdAt/updatedAt
- Unique constraints on identifiable fields (phone, email)
- Example (Client_Model.js):
  ```javascript
  const ClientSchema = Mongoose.Schema({
      name: { type: String, required: true },
      phone: { type: Number, required: true, unique: true },
      agent: { type: String, required: true },
  }, { timestamps: true });
  ```

#### Route Pattern
File: `API/{Resource}/{Resource}_Route.js`
- Middleware: Apply `Check_Login` to protected routes
- Naming: `GET /api/leads`, `POST /api/leads`, `PUT /api/leads/:id`, `DELETE /api/leads/:id`
- Example:
  ```javascript
  Route.get('/', Check_Login, LeadController.Leads);
  Route.post('/create', Check_Login, LeadController.Create);
  Route.put('/:id', Check_Login, LeadController.Update);
  Route.delete('/:id', Check_Login, LeadController.Delete);
  ```

### Styling Conventions

- **Tailwind CSS**: Primary utility framework for spacing, layout, responsive design
- **Material-UI**: Components for forms, dialogs, icons
- **Custom CSS**: Minimal (mostly in `Components/Datatable/MUI.css` for table tweaks)
- **Classes**: Use Tailwind utilities (e.g., `className="space-x-2 md:hidden"`)

### Authentication & Authorization

- **JWT Token**: Stored in `localStorage` as "token"
- **User Type**: Stored as "userType" (Admin, Management, Surveyor, Designer)
- **Token Setup**: On app startup, Routes.jsx validates token expiration and sets axios default header
- **Protected Routes**: Check `loggedIn` and `userType` in Routes.jsx conditionally render
- **Role-Based Access**:
  - **Admin/Management**: Full CRUD on most resources
  - **Surveyor/Designer**: Limited to In_Survey and In_Design workflows
  - **Admin only**: Users and Settings pages

## Important Files to Reference

- **Frontend**: `Routes.jsx` (routing & auth flow), `Layout.jsx` (template), `Components/Datatable/Datatable.jsx` (reusable table)
- **Backend**: `Server.js` (app setup), `Routes.js` (API routing), `Config/Database.js` (MongoDB connection)
- **Example CRUD**: `Pages/Client/` (list, add/edit, view) paired with `API/Client/` (controller, model, routes)

## Common Troubleshooting

1. **API calls fail with 401**: Token expired or missing. Check localStorage in Routes.jsx
2. **CORS errors**: Verify `VITE_SERVER_URL` matches server port and CORS is enabled in Server.js
3. **Form validation errors not showing**: Ensure `errors` state is passed to form fields and displayed conditionally
4. **Datatable doesn't refresh**: Call `refreshData()` or `fetchData()` after mutations

## Lead-Specific Workflow

Lead has complex status stages (In_Quote, In_Survey, In_Design/Project_Phase, In_Review, Closed, Lost_Lead). Each has dedicated pages mapping to `Pages/Lead/{Stage}/`. The `Add_Edit.jsx` includes extensive service type options (Planning, Design, Structural, Building Regulation, etc.). For new Lead-related features, extend these existing stage directories rather than creating new patterns.
